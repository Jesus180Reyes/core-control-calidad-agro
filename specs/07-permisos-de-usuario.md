# SPEC 07 — Permisos del usuario

> **Estado:** Implemented
> **Depende de:** SPEC 02, SPEC 06
> **Fecha:** 2026-08-29
> **Objetivo:** Pedir `GET /permisos/me` inmediatamente después de un login correcto, persistir la lista devuelta junto a la sesión y exponer un catálogo tipado (`PERMISSIONS`) con un hook `usePermissions` y un componente `<Can>`, sin que todavía ninguna pantalla cambie de comportamiento.

---

## Por qué existe este spec

SPEC 02 dejó la autorización explícitamente fuera de alcance: el `rol` del login *"se guarda y se muestra, pero **no** decide nada"*. La sesión de hoy sabe **quién** es el usuario y nada sobre **qué puede hacer**.

El backend ya expone la pieza que falta. Este spec la trae al front y la deja lista para consumir, pero **no** la aplica todavía: ni el Sidebar, ni las rutas, ni un solo botón cambian. Aplicar los permisos pantalla por pantalla toca navegación y guards, y va en su propio spec.

La parte del catálogo (`permissions.ts`) es igual de importante que la petición: sin una lista en duro de lo que la app espera, cada pantalla escribiría el string `'clientes.listar'` a mano y un typo se descubriría en planta, no en `tsc`.

---

## Contrato del backend

```
GET http://localhost:4000/permisos/me
Authorization: Bearer <accessToken>
```

Sin parámetros: el `me` sale del JWT.

**200 OK:**

```json
{
    "ok": true,
    "msg": "Permisos obtenidos correctamente",
    "permisos": [
        "clientes.listar",
        "lotes.crear"
    ]
}
```

Los strings son de forma `modulo.accion`. El front **no** asume que la lista se limite a los que conoce: guarda todo lo que llegue.

---

## Alcance

**Dentro:**

- Petición `GET /permisos/me` encadenada al `onSuccess` del login, después de guardar la sesión y antes de navegar a `/`.
- Cuarta clave en `localStorage` (`auth_permisos`) y `permisos: string[]` en `Sesion`.
- Catálogo `permissions.ts`: objeto plano `PERMISSIONS` con `as const` y el tipo `Permission` derivado.
- Aviso en desarrollo cuando el backend devuelve un permiso que el catálogo no conoce.
- Hook `usePermissions` con `has` / `hasAny` / `hasAll`, tipados contra `Permission`.
- Componente `<Can>` para envolver UI condicional.
- Tests de vitest del almacenamiento y de los helpers.
- Actualización de `CLAUDE.md` con la sección de permisos.

**Fuera de alcance (para specs futuros):**

- **Aplicar los permisos a la UI.** Ningún ítem del Sidebar se oculta, ninguna ruta se protege, ningún botón se deshabilita en este spec. Se entrega la herramienta, no su uso.
- Guards de ruta por permiso en `_portal.tsx` (`beforeLoad` con `throw redirect`).
- Revalidar los permisos al recargar la página o al cambiar de ruta. Se piden una sola vez, en el login.
- Refrescar los permisos sin volver a loguearse (el supervisor cambia un rol y el operario lo ve sin cerrar sesión).
- Cruzar los permisos con el PIN de supervisor del bloqueo crítico de `useControlCalidad`. Sigue con su PIN local, sin cambios.
- Sustituir o eliminar el campo `rol` de `Usuario`. Sigue guardándose y mostrándose en el Sidebar exactamente como hoy.
- Completar el catálogo con el CRUD de todos los módulos. Entran solo los dos permisos que el backend confirmó.
- Una pantalla de administración de roles y permisos.
- Sincronizar los permisos entre pestañas por el evento `storage`.
- Validar la respuesta del endpoint con zod.

---

## Modelo de datos

### Catálogo nuevo — `src/presentation/types/auth/permissions.ts`

Archivo nuevo, así que los identificadores van en **inglés** (regla de `CLAUDE.md`). Objeto plano, con `as const` para que el tipo salga de los valores y no haya una segunda lista que mantener:

```ts
/**
 * Los permisos que esta app conoce. La clave es el identificador que usa el
 * front; el valor es el string exacto que devuelve `GET /permisos/me`.
 *
 * Entran únicamente los permisos confirmados por el backend. Inventar claves
 * produce un catálogo que no coincide con nada y un `has()` que siempre da
 * `false` sin que nadie se entere.
 */
export const PERMISSIONS = {
    CLIENTES_LISTAR: 'clientes.listar',
    LOTES_CREAR: 'lotes.crear',
} as const

/** Los valores del catálogo. Es lo que aceptan `has`, `hasAny` y `hasAll`. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
```

Más una función pura, en el mismo archivo:

```ts
/**
 * Avisa en desarrollo de los permisos que el backend devolvió y el catálogo no
 * conoce. No filtra nada: la lista se guarda entera igual (ver decisiones).
 */
export function advertirPermisosDesconocidos(permisos: string[]): void
```

### Tipos modificados — `src/presentation/types/auth/auth.types.ts`

```ts
export interface PermisosResponse {
    ok: boolean
    msg: string
    permisos: string[]
}

export interface Sesion {
    accessToken: string
    usuario: Usuario
    refreshToken?: string
    /**
     * Lo que devolvió `/permisos/me`, tal cual. `string[]` y no `Permission[]`
     * a propósito: el backend puede emitir permisos que el catálogo todavía no
     * conoce y no hay que perderlos.
     */
    permisos: string[]
}
```

`permisos` es **obligatorio**, no opcional: `leerSesion` lo resuelve a `[]` cuando la clave falta, así que ningún consumidor tiene que escribir `?? []`.

### Persistencia — `almacenamientoSesion.ts`

Cuarta clave, junto a las tres de hoy. Los identificadores nuevos **dentro de este archivo** van en español, siguiendo el idioma del archivo:

```ts
const CLAVE_TOKEN = 'auth_token'
const CLAVE_USUARIO = 'auth_user'
const CLAVE_REFRESH = 'auth_refresh'
const CLAVE_PERMISOS = 'auth_permisos'   // nueva
```

Contenido: el array serializado con `JSON.stringify`.

```
// "auth_permisos"
["clientes.listar","lotes.crear"]
```

`limpiarStorage` borra las cuatro. `leerSesion` lee la clave, y devuelve `[]` si falta, si no parsea, o si lo parseado no es un array — igual que hoy trata al `refreshToken` ausente: **una sesión sin permisos es una sesión válida**. Eso cubre también a los operarios que ya estén logueados en el momento del despliegue.

---

## Plan de implementación

Cada paso deja el proyecto compilando y la suite en verde.

1. **Crear `src/presentation/types/auth/permissions.ts`** con `PERMISSIONS`, `Permission` y `advertirPermisosDesconocidos`. La función sale temprano si no está en desarrollo (`import.meta.env.DEV`), calcula la diferencia contra `Object.values(PERMISSIONS)` y, si hay alguna, imprime **un solo** `console.warn` con la lista.
   Verificación: `npx tsc --noEmit` pasa.

2. **Sumar `PermisosResponse` y `Sesion.permisos` a `auth.types.ts`.** Al volverse obligatorio, `tsc` marca los puntos donde hoy se construye una `Sesion` — que es exactamente el objetivo: que ninguno quede sin decidir.
   Verificación: `npx tsc --noEmit` señala solo los constructores de `Sesion`, que el paso siguiente arregla.

3. **Extender `almacenamientoSesion.ts`.**
   - `CLAVE_PERMISOS`, incluida en `limpiarStorage`.
   - `leerSesion` la lee y la degrada a `[]` ante ausencia, JSON inválido o un valor que no sea array.
   - `guardarSesion` la escribe con `JSON.stringify(sesion.permisos)`.
   - `guardarPermisos(permisos: string[]): void` — escribe solo esa clave, invalida la caché y **sí notifica** a los suscriptores. A diferencia de `guardarTokens`, acá el cambio sí es perceptible: `<Can>` tiene que repintarse cuando llegan los permisos.
   - `leerPermisos(): string[]` — atajo síncrono para quien no quiera montar React.
   Todo dentro del `try/catch` y la guarda de `typeof window` que ya tiene el módulo.
   Verificación: `npx tsc --noEmit` pasa.

4. **Encadenar la petición en `useLogin.tsx`.** El `onSuccess` de la mutación pasa a ser `async` y, **en este orden**:
   1. `iniciarSesion(data)` — el token tiene que estar en `localStorage` antes de la petición, porque el `onPeticion` de `interceptores-auth` lee `leerToken()` para inyectar el `Bearer`.
   2. `httpGet<PermisosResponse>('/permisos/me')` dentro de un `try/catch`.
   3. En éxito: `advertirPermisosDesconocidos(respuesta.permisos)` y `guardarPermisos(respuesta.permisos)`.
   4. En fallo: se traga el error y se sigue con `permisos: []`. El login **no** se convierte en error.
   5. `navigate({ to: '/' })` — fuera del `try/catch`, en un `finally` o después: se navega pase lo que pase.

   `enviando` deja de ser `mutation.isPending` a secas y pasa a ser `mutation.isPending || cargandoPermisos`, con un `useState` propio. Sin eso el botón vuelve a decir "Ingresar" mientras la segunda petición está en vuelo, y el operario cree que el login falló.

   De paso se borra el `console.log(error)` del `onError` (`useLogin.tsx:59`), que imprime el error de credenciales en la consola de producción.
   Verificación: `npx tsc --noEmit` pasa. Manual: en la pestaña Network se ven `POST /auth/login` y `GET /permisos/me` en ese orden, la segunda con el `Bearer`, y `auth_permisos` aparece en `localStorage`.

5. **Crear `src/presentation/hooks/auth/usePermissions.tsx`.** Monta `useAuth()` y deriva de `sesion.permisos`:
   - `permissions: string[]` — la lista cruda.
   - `has(permission: Permission): boolean`
   - `hasAny(...permissions: Permission[]): boolean`
   - `hasAll(...permissions: Permission[]): boolean`

   Los tres tipados contra `Permission`, así un string suelto no compila. Internamente trabajan sobre un `Set` memoizado con `useMemo` sobre `sesion.permisos`, para no recorrer el array en cada render de cada `<Can>`. Sin sesión, la lista es `[]` y los tres devuelven `false`.
   Verificación: `npx tsc --noEmit` pasa.

6. **Crear `src/presentation/components/shared/Can.tsx`.** Componente de conveniencia sobre el hook:
   ```tsx
   interface CanProps {
       permission?: Permission
       anyOf?: Permission[]
       allOf?: Permission[]
       fallback?: ReactNode
       children: ReactNode
   }
   ```
   Renderiza `children` si la condición se cumple, y `fallback` (por defecto `null`) si no. Las tres props son excluyentes; si llegan varias, se evalúan todas y tienen que cumplirse todas. Sin ninguna de las tres, renderiza `children` — un `<Can>` sin condición no debería esconder nada.
   Verificación: `npx tsc --noEmit` pasa.

7. **Crear `src/presentation/hooks/auth/usePermissions.test.tsx`** (`// @vitest-environment jsdom`). Casos:
   - `leerSesion()` devuelve `permisos: []` cuando `auth_permisos` no existe, y la sesión sigue siendo válida.
   - `auth_permisos` con JSON corrupto o con un valor que no es array degrada a `[]` sin lanzar.
   - `guardarPermisos` persiste la clave y **notifica** a los suscriptores.
   - `limpiarSesion()` borra `auth_permisos` junto con las otras tres claves.
   - `has` devuelve `true` para un permiso presente y `false` para uno ausente.
   - `hasAny` / `hasAll` con listas parcialmente cubiertas.
   - Sin sesión, los tres helpers devuelven `false`.
   - `advertirPermisosDesconocidos` no lanza ante una lista con permisos fuera del catálogo.
   Verificación: `npx vitest run src/presentation/hooks/auth/usePermissions.test.tsx` pasa.

8. **Actualizar `CLAUDE.md`.** Una sección de permisos: el catálogo `permissions.ts` como única fuente de los strings, `usePermissions`/`<Can>` como la forma de consultarlos, y las dos reglas que hay que respetar al tocar esto — los permisos se piden **solo** en el login, y un fallo de `/permisos/me` no bloquea la entrada.

9. **Verificación final:** `npx tsc --noEmit` y `npx vitest run` completos, más el recorrido manual de los criterios de aceptación contra el backend en `http://localhost:4000`.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` pasa sin errores.
- [X] `npx vitest run` pasa completo, incluido `usePermissions.test.tsx`.
- [ ] Un login correcto dispara `GET /permisos/me` **después** de `POST /auth/login`, con el header `Authorization: Bearer <token>` del token recién emitido (verificable en Network).
- [ ] Tras el login, `localStorage` tiene `auth_permisos` con `["clientes.listar","lotes.crear"]`.
- [ ] Mientras `/permisos/me` está en vuelo, el botón del login sigue deshabilitado y diciendo "Ingresando…".
- [ ] Con `/permisos/me` devolviendo 500, el usuario **entra igual** al portal, `sesion.permisos` es `[]` y no aparece ningún error en la card de login.
- [ ] Con `/permisos/me` inexistente (404), el login funciona igual que antes de este spec.
- [ ] Recargar la página con sesión abierta conserva los permisos y **no** vuelve a pedir `/permisos/me`.
- [ ] Una sesión guardada antes de este spec (sin `auth_permisos`) sigue siendo válida: el usuario no es expulsado a `/login` y `sesion.permisos` es `[]`.
- [ ] `auth_permisos` con contenido corrupto (`"{{{"`, o `"42"`) degrada a `[]` sin lanzar y sin invalidar la sesión.
- [ ] "Cerrar Sesión" borra `auth_permisos` junto con `auth_token`, `auth_user` y `auth_refresh`.
- [ ] Con la sesión del ejemplo, `has(PERMISSIONS.CLIENTES_LISTAR)` es `true` y `has(PERMISSIONS.LOTES_CREAR)` es `true`.
- [ ] `has('clientes.eliminar')` **no compila**: el string no pertenece a `Permission`.
- [ ] Un `<Can permission={...}>` con el permiso presente pinta sus hijos; sin él pinta el `fallback` (o nada).
- [ ] En `npm run dev`, un `/permisos/me` que devuelve `["clientes.listar","reportes.exportar"]` imprime un solo `console.warn` mencionando `reportes.exportar`, y **ambos** permisos quedan guardados.
- [ ] En el build de producción no se imprime ningún `console.warn` de permisos.
- [ ] El Sidebar, las rutas del portal y todos los botones se comportan **exactamente igual** que antes de este spec: ningún elemento se oculta ni se deshabilita por permisos.
- [ ] `CLAUDE.md` documenta el catálogo, el hook y las dos reglas del flujo.

---

## Decisiones

- **Sí:** los permisos se piden en el `onSuccess` del login. Decisión del usuario. Un solo punto de disparo, y el portal arranca con la lista ya en la sesión: ninguna pantalla necesita un estado de carga para saber qué puede mostrar.
- **No:** pedirlos en el guard del portal o en un `useSuspenseQuery` del layout. Agrega una petición por recarga y un estado de carga en el camino crítico de cada entrada al portal, para un dato que casi nunca cambia dentro de una sesión.
- **Sí:** la petición va **después** de `iniciarSesion(data)`. El `Bearer` lo inyecta el `onPeticion` de `interceptores-auth` leyendo `leerToken()` de `localStorage`; pedirlos antes de guardar el token los mandaría sin autorización.
- **Sí:** `permisos` se persiste en `localStorage`, junto a la sesión. Decisión del usuario. Sobrevive a la recarga sin repetir la petición, y `limpiarSesion()` los borra con todo lo demás sin código extra.
- **No:** dejarlos solo en la caché de TanStack Query. Un F5 los perdería, lo que obligaría a pedirlos también en el portal — el camino que ya se descartó.
- **Sí:** un fallo de `/permisos/me` deja entrar al usuario con `permisos: []`. Decisión del usuario. Como este spec todavía no oculta nada, el efecto hoy es nulo; el día que la UI dependa de los permisos, habrá que revisar esta decisión, porque un operario sin acciones visibles es indistinguible de una app rota.
- **Sí:** `guardarPermisos` **notifica** a los suscriptores, al revés que `guardarTokens` de SPEC 06. Ahí el argumento era que un refresh de token no cambia nada perceptible; acá sí: `<Can>` tiene que repintarse cuando la lista llega.
- **Sí:** `Sesion.permisos` es obligatorio y `leerSesion` lo degrada a `[]`. Opcional obligaría a cada consumidor a escribir `?? []`, y bastaría con que uno se olvide para tener un `undefined.includes` en producción.
- **Sí:** una sesión sin `auth_permisos` es válida. Decisión del usuario. Invalidarla echaría del portal a todos los operarios logueados en el momento del deploy, para corregir un dato que este spec todavía no usa.
- **Sí:** catálogo como objeto plano de constantes con `as const`. Decisión del usuario. El tipo `Permission` se deriva de los valores, así que no hay una segunda lista que mantener sincronizada, y un typo no compila.
- **No:** un catálogo agrupado por módulo (`PERMISSIONS.clientes.listar`). Con dos permisos, la anidación es ceremonia; el día que sean cuarenta, se reevalúa.
- **Sí:** solo los dos permisos confirmados por el backend. Decisión del usuario. Una clave inventada produce un `has()` que devuelve `false` para siempre sin que nadie sospeche por qué, que es peor que no tenerla.
- **Sí:** la sesión guarda `string[]`, pero `has`/`hasAny`/`hasAll` aceptan `Permission`. Guardar ancho y consultar estrecho: no se pierde nada de lo que emite el backend, y el front solo puede preguntar por lo que conoce.
- **Sí:** un permiso fuera del catálogo se guarda igual y se avisa por `console.warn` en desarrollo. Decisión del usuario. Descartarlo dejaría inerte en el front un permiso que el backend ya concede, y guardarlo en silencio haría que el catálogo se quedara corto sin que nadie lo notara.
- **Sí:** el aviso lee `import.meta.env.DEV`. `CLAUDE.md` reserva la lectura de `import.meta.env` a `core/config-http.ts`, pero esa regla es sobre la **configuración del cliente HTTP** (`VITE_API_URL`, timeouts); el flag `DEV` de Vite no es configuración de nadie y no tiene sentido rutearlo por `infrastructure/http`.
- **Sí:** `usePermissions` memoiza un `Set` sobre `sesion.permisos`. Cada `<Can>` de una tabla haría un `Array.includes` por fila y por render; el `Set` lo vuelve constante.
- **Sí:** `<Can>` además del hook. Decisión del usuario. El hook cubre la lógica y `<Can>` cubre el caso mayoritario —envolver un botón— sin obligar a montar un ternario en cada JSX.
- **Sí:** `<Can>` sin ninguna de las tres props renderiza sus hijos. La alternativa —esconderlos— convierte un olvido de prop en contenido que desaparece sin error.
- **Sí:** identificadores en inglés en los archivos nuevos (`permissions.ts`, `usePermissions`, `has`, `<Can>`) y en español en lo que se agrega a archivos ya escritos en español (`guardarPermisos`, `leerPermisos`, `CLAVE_PERMISOS`, `Sesion.permisos`). Decisión del usuario. Es la regla de `CLAUDE.md` aplicada sin partir el idioma a mitad de `almacenamientoSesion.ts`.
- **No:** aplicar los permisos a la UI en este spec. Ocultar ítems del Sidebar y proteger rutas cambia la navegación —el guard de `_portal.tsx` y el menú— y exige decidir qué ve un usuario sin ningún permiso. Es otro spec.
- **No:** validar `PermisosResponse` con zod. El único campo que se usa es `permisos`, y `leerSesion` ya degrada a `[]` cualquier cosa que no sea un array. Un schema acá sería una tercera declaración del mismo contrato.
- **No:** revalidar los permisos fuera del login. Un cambio de rol se ve al volver a entrar, que en planta es el próximo turno. Refrescarlos en vivo abre la pregunta de qué pasa con una pantalla ya abierta cuyo permiso acaba de desaparecer, y eso merece su propio spec.
- **No:** tocar el campo `rol`. Sigue guardándose y mostrándose en el Sidebar. Los permisos lo reemplazan como fuente de decisiones, pero eso ocurre en el spec que aplique la autorización, no en este.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `GET /permisos/me` devuelve 401 con el token recién emitido: la fachada de SPEC 06 ve un 401 con token, no hay `refreshToken`, y llama a `cerrarSesionYSalir()` — borra la sesión que se acaba de crear y manda a `/login`. El `try/catch` del paso 4 no lo evita, porque la sesión ya fue limpiada dentro de `httpRequest`. | Es el comportamiento correcto: un token que el propio backend rechaza no debería dejar entrar a nadie. Pero se ve como "el login no hace nada" desde la pantalla. Si el backend llegara a responder 401 en `/permisos/me` por falta del permiso en vez de por token inválido, el arreglo es que devuelva 403, no que el front ignore el 401. |
| El login pasa de una petición a dos: si `/permisos/me` es lento, el operario espera más para entrar. | `enviando` cubre las dos peticiones, así que el botón no miente. El timeout del cliente (15 s) acota el peor caso, y al agotarse el usuario entra con `permisos: []`. |
| El catálogo se desincroniza del backend: alguien agrega un permiso en el API y en el front nadie se entera. | El `console.warn` de desarrollo lista los desconocidos en cada login. Es un aviso, no una garantía: si nadie loguea en dev, nadie lo ve. |
| Al revés: el catálogo declara un permiso que el backend no emite nunca. `has()` devuelve `false` para siempre y la UI que dependa de él queda invisible sin error. | Por eso entran solo los dos confirmados. Cada alta futura del catálogo tiene que venir con el string verificado contra el backend. |
| `permisos` obligatorio en `Sesion` rompe la compilación en todos los puntos donde hoy se construye una sesión. | Es intencional y está en el paso 2: `tsc` marca exactamente los lugares que hay que decidir, en vez de dejar un `undefined` circulando. |
| Dos pestañas: la pestaña A cierra sesión y la B se queda con los permisos en su snapshot. | Es el mismo comportamiento que ya tiene la sesión completa desde SPEC 02; sincronizar por el evento `storage` está fuera de alcance y anotado allá. |
| Los permisos quedan en `localStorage`, editables desde la consola del navegador: cualquiera se agrega `"lotes.crear"` a mano. | El front **no** es el punto de control. Ocultar un botón es UX, no seguridad; quien tiene que rechazar la operación es el backend en cada endpoint. Vale la pena dejarlo escrito antes de que alguien asume lo contrario. |
| `<Can>` y `usePermissions` entran sin ningún consumidor: código no ejercitado en producción. | Los tests del paso 7 los cubren, y es la misma decisión consciente que SPEC 06 tomó con `parsear: 'blob'` y el multipart: cerrar la infraestructura de una vez en vez de volver sobre ella. |

---

## Lo que **no** entra en este spec

- Ocultar ítems del Sidebar, proteger rutas o deshabilitar botones según los permisos.
- Guards de ruta por permiso en `_portal.tsx`.
- Revalidar o refrescar los permisos fuera del login.
- Cruzar los permisos con el PIN de supervisor de `useControlCalidad`.
- Sustituir o eliminar el campo `rol`.
- Completar el catálogo con el CRUD de todos los módulos.
- Una pantalla de administración de roles y permisos.
- Sincronizar los permisos entre pestañas por el evento `storage`.
- Validar la respuesta de `/permisos/me` con zod.

Cada uno de ellos, si se hace, va en su propio spec.
