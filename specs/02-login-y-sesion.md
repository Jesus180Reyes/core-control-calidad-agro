# SPEC 02 — Login y sesión contra el backend

> **Estado:** Draft
> **Depende de:** —
> **Fecha:** 2026-08-21
> **Objetivo:** Reemplazar el placeholder de `/login` por una pantalla real que autentique contra `POST /auth/login`, persista la sesión y proteja el portal, para que el operario entre con su usuario y contraseña en vez de con el guard falso `isLogged = true`.

---

## Por qué existe este spec

Hoy hay dos placeholders que se sostienen mutuamente:

- `src/routes/(auth)/_auth.login.tsx:8` devuelve literalmente `<div>Hello "/(auth)/_auth/login"!</div>`. No hay pantalla de login.
- `src/routes/(portal)/_portal.tsx:13` tiene `const isLogged = true`. El guard nunca redirige, así que cualquiera abre `/control-calidad` sin autenticarse.

Además `src/presentation/components/shared/SideBar.tsx:112` ya hace `localStorage.removeItem('auth_token')` al cerrar sesión: el contrato de persistencia está escrito a medias en el Sidebar y nadie lo escribe del otro lado. Y `http-client.ts` no manda ningún header de autorización, así que ninguna petición del portal puede autenticarse aunque el token existiera.

Este spec cierra el círculo completo: formulario → token → header → guard → cerrar sesión.

---

## Contrato del backend

Único endpoint disponible hoy. **No existen `/auth/me`, `/auth/refresh` ni `/auth/logout`**, y el spec está diseñado para no necesitarlos.

```
POST http://localhost:4000/auth/login
```

**Request body:**

```json
{
  "username": "JREYES",
  "password": "..."
}
```

**200 OK:**

```json
{
  "ok": true,
  "msg": "Usuario logueado correctamente",
  "user": {
    "id": 17,
    "cedula": "0601200103313",
    "username": "JREYES",
    "complete_name": "Luis de Jesus Reyes Nolasco",
    "rol": "OPERADOR"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
}
```

**401 Unauthorized:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Variable de entorno.** `VITE_API_URL` **debe incluir el esquema**:

```
VITE_API_URL=http://localhost:4000
```

Sin `http://`, `buildUrl` (`http-client.ts:43`) produce `localhost:4000/auth/login`, que `fetch` resuelve como ruta **relativa** al origen del dev server (`http://localhost:3000/localhost:4000/auth/login`) y la petición falla con un 404 del propio Vite. Es el primer error que se va a encontrar quien implemente esto.

---

## Alcance

**Dentro:**

- Pantalla de login en `/login`, derivada de los tokens y del lenguaje visual que ya usan el Sidebar y las cards de `/control-calidad`.
- Formulario con `react-hook-form` + `zod` (`username`, `password`) a través de `ControlledInput`.
- Mutación contra `POST /auth/login` vía `useExecuteMutation`.
- Persistencia de la sesión (token + usuario) en `localStorage`.
- Hook `useAuth` que expone la sesión, `estaAutenticado` y `logout()`, reactivo entre componentes.
- Inyección automática de `Authorization: Bearer <token>` en `http-client.ts`.
- Cierre de sesión global ante un `401` de cualquier petición **autenticada**.
- Guard real en `(portal)/_portal.tsx` reemplazando `isLogged = true`.
- Redirección a `/` tras el login correcto, y de `/login` a `/` si ya hay sesión.
- Sidebar mostrando `complete_name` y `rol`, con el botón de cerrar sesión cableado a `useAuth().logout()`.
- Test de Vitest del hook de login.
- Archivo `.env` con `VITE_API_URL`.

**Fuera de alcance (para specs futuros):**

- Refresh token y renovación silenciosa de la sesión. El backend no expone el endpoint.
- Validar el token contra el backend al navegar (`/auth/me`). No existe ese endpoint.
- Expiración proactiva leyendo el `exp` del JWT en el front.
- Recuperación de contraseña, registro de usuarios, cambio de contraseña.
- "Recordarme" / sesión efímera vs persistente.
- Autorización por rol: ocultar rutas o acciones según `rol`. El rol se guarda y se muestra, pero **no** decide nada.
- Cruzar el rol del usuario con el PIN de supervisor del bloqueo crítico de `useControlCalidad`. Sigue con su PIN local, sin cambios.
- Cablear el token en los hooks de dominio que hoy devuelven mocks (`useControlCalidad`, `useParametros`). La inyección del header es global; cuando esos hooks dejen de ser mock, ya viajará.
- Rediseñar `ControlledInput` para que use los tokens semánticos (hoy tiene `bg-white` y `text-slate-400` fijos).

---

## Modelo de datos

### Tipos nuevos — `src/presentation/types/auth/auth.types.ts`

Los nombres de campo **espejan el wire format del backend**, incluido `complete_name` en snake_case, para que no haya una capa de traducción que mantener.

```ts
/**
 * Rol devuelto por el backend. Se deja abierto a `string` porque hoy solo se
 * conoce `'OPERADOR'`; cerrarlo en una unión rompería el login de cualquier
 * usuario con otro rol.
 */
export type RolUsuario = string

export interface Usuario {
    id: number
    cedula: string
    username: string
    complete_name: string
    rol: RolUsuario
}

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    ok: boolean
    msg: string
    user: Usuario
    accessToken: string
}

/** Lo que vive en `localStorage`, ya reconstruido. */
export interface Sesion {
    accessToken: string
    usuario: Usuario
}
```

### Persistencia — `localStorage`

Dos claves. `auth_token` se mantiene **con ese nombre exacto** porque es la que ya borra `SideBar.tsx:112`:

```ts
// "auth_token"
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."

// "auth_user"
{"id":17,"cedula":"0601200103313","username":"JREYES","complete_name":"Luis de Jesus Reyes Nolasco","rol":"OPERADOR"}
```

Toda lectura y escritura va envuelta en `try/catch` con guarda de `typeof window === 'undefined'`, igual que `almacenamientoBasculas.ts` del SPEC 01. Si `auth_user` está corrupto o ausente pero `auth_token` existe, la sesión se considera **inválida** y se limpia: no se admite media sesión.

### Schema de validación — dentro de `useLogin.tsx`

```ts
const loginSchema = z.object({
    username: z.string().min(1, 'El usuario es obligatorio'),
    password: z.string().min(1, 'La contraseña es obligatoria'),
})
```

Solo obligatoriedad. Sin `.email()`, sin mínimo de longitud, sin regex: las reglas de la contraseña las pone el backend y duplicarlas en el front solo produce falsos rechazos.

---

## Plan de implementación

1. **Crear `.env`** en la raíz con `VITE_API_URL=http://localhost:4000`. Verificación: `npm run dev` arranca y `import.meta.env.VITE_API_URL` no es `undefined`.

2. **Crear `src/presentation/types/auth/auth.types.ts`** con los tipos de arriba. Verificación: `npx tsc --noEmit` pasa.

3. **Crear `src/presentation/hooks/auth/almacenamientoSesion.ts`.** Módulo puro, sin React, con un store mínimo suscribible:
   - `leerSesion(): Sesion | null` — lee ambas claves, parsea `auth_user`, devuelve `null` si falta o falla cualquiera de las dos.
   - `guardarSesion(sesion: Sesion): void`
   - `limpiarSesion(): void`
   - `leerToken(): string | null` — atajo síncrono para el `http-client`, sin pasar por React.
   - `suscribir(fn: () => void): () => void` y `snapshot(): Sesion | null` — para `useSyncExternalStore`. Toda escritura notifica a los suscriptores.
   Todo con `try/catch` y guarda de `typeof window`.

4. **Crear `src/presentation/hooks/auth/useAuth.tsx`.** Usa `useSyncExternalStore(suscribir, snapshot, () => null)` — el `getServerSnapshot` devuelve `null` para que el render del servidor y el primer render del cliente coincidan y no haya error de hidratación. Expone:
   - `sesion: Sesion | null`, `usuario: Usuario | null`, `estaAutenticado: boolean`
   - `iniciarSesion(respuesta: LoginResponse)` — arma la `Sesion` y la guarda
   - `logout()` — limpia y navega a `/login`

5. **Crear `src/presentation/hooks/auth/useLogin.tsx`.** Concentra toda la lógica de la pantalla; la ruta solo pinta. Monta:
   - `useForm<LoginRequest>` con `zodResolver(loginSchema)` y `defaultValues: { username: '', password: '' }`
   - `useExecuteMutation<LoginResponse, LoginRequest>('/auth/login')`
   - `onSubmit` que en éxito llama `iniciarSesion(data)` y navega a `/`
   - `errorLogin: string | null` derivado del fallo: si es `HttpError` con `status === 401` → `'Usuario o contraseña incorrectos'`; si `status >= 500` → `'El servidor no está disponible. Intentá de nuevo.'`; si el `fetch` falla sin respuesta (backend caído, CORS) → `'No se pudo contactar al servidor.'`
   - `verPassword` / `alternarVerPassword` para el ojo del input
   Expone `{ control, onSubmit, enviando, errorLogin, verPassword, alternarVerPassword }`.

6. **Crear `src/presentation/hooks/auth/useLogin.test.tsx`** (`// @vitest-environment jsdom`), con `global.fetch` mockeado y `localStorage` de jsdom. Casos:
   - Submit con campos vacíos no llama a `fetch` y marca los dos errores de zod.
   - Login correcto guarda `auth_token` y `auth_user` en `localStorage`.
   - `401` deja `localStorage` vacío y `errorLogin` en `'Usuario o contraseña incorrectos'`.
   - `500` produce el mensaje de servidor no disponible.
   - `fetch` que rechaza produce el mensaje de contacto.
   - `logout()` borra ambas claves.

7. **Crear `src/presentation/views/auth/LoginCard.tsx`.** Componente presentacional puro: recibe lo que expone `useLogin` y no consulta nada. Card centrada `max-w-sm`, `bg-surface`, `rounded-[28px]`, `border border-border-ui/50`, `shadow-clay-card`. Arriba el mismo cuadro `bg-indigo-600 dark:bg-indigo-500 rounded-2xl shadow-clay-btn` con el ícono del Sidebar, y los títulos "Bascula" / "QUALITY INSPECTOR" con la misma tipografía. Dos `ControlledInput` (Usuario, Contraseña con `type` alternable y botón de ojo). El error de credenciales va en un bloque `bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/60 rounded-xl` **encima** del botón, no como error de campo, porque no pertenece a ninguno de los dos. Botón de ancho completo con `shadow-clay-btn`, deshabilitado mientras `enviando` y con el texto "Ingresando…".

8. **Modificar `src/routes/(auth)/_auth.tsx`**: el layout centra el `<Outlet/>` en pantalla completa con `bg-bg-app` (`min-h-screen flex items-center justify-center p-4`). Agregar `beforeLoad` que, **solo en el cliente**, redirija a `/` si ya hay token: entrar a `/login` con sesión abierta no debe mostrar el formulario.

9. **Modificar `src/routes/(auth)/_auth.login.tsx`**: `createFileRoute` + `useLogin()` + `<LoginCard />`. Nada más; se borra el `<div>Hello ...`.

10. **Modificar `src/infrastructure/http/http-client.ts`**, dos cambios en `httpRequest`/`parseResponse`:
    - Antes del `fetch`, leer el token con `leerToken()` y, si existe y quien llama no pasó ya un `Authorization` propio, agregar `Authorization: Bearer <token>`.
    - En `parseResponse`, si `response.status === 401` **y la petición llevaba token**, llamar `limpiarSesion()` y hacer `window.location.assign('/login')` antes de lanzar el `HttpError`. La condición "llevaba token" es la que evita que el propio login (que no manda token y responde 401 legítimamente) dispare la redirección; así el mensaje de credenciales inválidas se pinta en el formulario en vez de recargar la página.
    Verificación: `npx vitest run` sigue en verde.

11. **Modificar `src/routes/(portal)/_portal.tsx`**: reemplazar `const isLogged = true` por la lectura real del token. `beforeLoad` corre también en el servidor, donde no hay `localStorage`, así que la comprobación se hace **solo si `typeof window !== 'undefined'`**; en SSR se deja pasar y el guard efectivo ocurre en la hidratación. Sin token → `throw redirect({ to: '/login' })`.

12. **Modificar `src/presentation/components/shared/SideBar.tsx`**: montar `useAuth()`; sobre el botón de cerrar sesión, mostrar un bloque con `complete_name` (`text-text-main font-bold`, truncado) y `rol` (`text-text-muted text-[10px] uppercase tracking-widest`), y un avatar circular con las iniciales. El `onClick` del botón pasa de `localStorage.removeItem('auth_token'); window.location.reload()` a `logout()`. Si `usuario` es `null`, el bloque no se pinta y el Sidebar queda como hoy.

13. **Verificación final:** `npx tsc --noEmit` y `npx vitest run` completos, más el recorrido manual de los criterios de aceptación contra el backend en `http://localhost:4000`.

---

## Criterios de aceptación

- [ ] Abrir `/control-calidad` sin sesión redirige a `/login`.
- [ ] `/login` muestra la card con logo, campos Usuario y Contraseña, y botón de ingresar.
- [ ] Enviar el formulario vacío marca los dos campos con su mensaje de zod y **no** dispara ninguna petición HTTP.
- [ ] Credenciales correctas guardan `auth_token` y `auth_user` en `localStorage` y llevan al dashboard `/`.
- [ ] Credenciales incorrectas (401) muestran "Usuario o contraseña incorrectos" en la card, **sin** recargar la página ni redirigir, y `localStorage` sigue vacío.
- [ ] Con el backend apagado, el formulario muestra "No se pudo contactar al servidor." y no queda colgado en "Ingresando…".
- [ ] Mientras la petición está en vuelo el botón está deshabilitado y dice "Ingresando…".
- [ ] El botón de ojo alterna el `type` del campo de contraseña entre `password` y `text`.
- [ ] Tras el login, el Sidebar muestra "Luis de Jesus Reyes Nolasco" y "OPERADOR".
- [ ] Recargar la página con sesión abierta mantiene al usuario dentro y el Sidebar sigue mostrando su nombre.
- [ ] Entrar a `/login` con sesión abierta redirige a `/`.
- [ ] "Cerrar Sesión" borra `auth_token` y `auth_user` y deja al usuario en `/login`; volver atrás con el botón del navegador no reingresa al portal.
- [ ] Cualquier petición hecha con `httpGet`/`httpPost` después del login lleva el header `Authorization: Bearer <token>` (verificable en la pestaña Network).
- [ ] Un `401` en una petición autenticada limpia la sesión y deja al usuario en `/login`.
- [ ] La pantalla de login se ve correcta en modo claro y oscuro, y a 360 px de ancho.
- [ ] `npx vitest run` pasa completo, incluyendo `useLogin.test.tsx`.
- [ ] `npx tsc --noEmit` pasa sin errores.

---

## Decisiones

- **Sí:** token en `localStorage` bajo la clave `auth_token`. Es lo que ya asume `SideBar.tsx:112`; cambiar el nombre obligaría a tocar ese código sin ganar nada. Expone a XSS, pero es una app interna de planta sin contenido de terceros y el alternativo (cookie `httpOnly`) exige CORS con credenciales y cambios en el backend que hoy no están.
- **No:** clave versionada `auth:v1` al estilo del SPEC 01. Rompería el `removeItem('auth_token')` ya escrito, y el formato de un JWT no va a migrar.
- **Sí:** dos claves separadas (`auth_token`, `auth_user`) en vez de un solo objeto JSON. Así el `http-client` lee el token con un `getItem` sin parsear nada, y una petición no paga un `JSON.parse` por llamada.
- **Sí:** el `http-client` inyecta el header. Un solo punto de cambio y ningún hook de dominio se entera. Se respeta un `Authorization` explícito si quien llama ya lo pasó.
- **Sí:** el `401` global se maneja en `parseResponse` y solo cuando la petición llevaba token. Sin esa condición, el propio login rebotaría con `window.location.assign` y el operario nunca vería el mensaje de credenciales inválidas.
- **Sí:** `window.location.assign('/login')` en el interceptor, en vez de inyectar el router en la capa de infraestructura. `http-client.ts` no debe importar `@tanstack/react-router`; una recarga limpia en un 401 es aceptable y borra además cualquier caché de TanStack Query.
- **Sí:** `useSyncExternalStore` sobre un store mínimo en `almacenamientoSesion.ts`. Es la forma correcta de leer un valor externo y no de React sin romper la hidratación de SSR, y mantiene sincronizados a todos los consumidores cuando se cierra sesión sin recargar.
- **No:** `useState` + `useEffect` leyendo `localStorage`. Cada componente tendría su propia copia y el Sidebar se quedaría con el usuario viejo tras un `logout()` que no recargue la página.
- **No:** un `AuthContext` con provider en `__root.tsx`. El store externo ya da el mismo alcance global sin añadir un nivel de árbol ni obligar a que todo consumidor esté dentro del provider.
- **Sí:** guard por presencia de token, sin validarlo. No existe `/auth/me`, y decodificar el `exp` del JWT en el front duplicaría en el cliente una regla que solo el backend puede hacer cumplir. Un token expirado se descubre en la primera petición, que devuelve 401 y cierra la sesión: la sesión efectivamente dura lo que dura el token.
- **Sí:** el `beforeLoad` del portal comprueba el token **solo en el cliente**. `beforeLoad` corre también en el servidor, donde `localStorage` no existe; comprobarlo ahí lanzaría o redirigiría siempre.
- **Sí:** zod valida únicamente que los campos no estén vacíos. Replicar reglas de contraseña en el front produce falsos rechazos en cuanto el backend las cambie.
- **Sí:** el mensaje del 401 es fijo en el front ("Usuario o contraseña incorrectos") y **no** se lee `message` del body. El backend devuelve `"Unauthorized"`, que no se le muestra en inglés a un operario de planta.
- **Sí:** se distinguen tres fallos con mensajes distintos (401, 5xx, sin respuesta). "Contraseña incorrecta" cuando en realidad el backend está apagado hace perder mucho tiempo en planta.
- **Sí:** los tipos espejan el wire format, `complete_name` en snake_case incluido. Renombrar a `nombreCompleto` obliga a mantener una capa de mapeo para un solo endpoint.
- **Sí:** `RolUsuario = string` en vez de una unión cerrada. Solo se conoce `'OPERADOR'`; una unión con los demás roles inventados dejaría fuera del sistema a los usuarios reales o mentiría al `tsc`.
- **No:** el rol no controla nada en este spec. Se guarda y se muestra. Cruzarlo con el PIN de supervisor del bloqueo crítico cambia reglas de negocio de `useControlCalidad`, el hook más delicado del repo, y va en su propio spec.
- **Sí:** redirección fija a `/` tras el login. Un `search param` `redirect` es más elegante, pero el operario entra siempre por la misma puerta y no se comparten enlaces profundos.
- **No:** "Recordarme". Sin ese switch la sesión es siempre persistente, que es lo que quiere alguien que abre la misma pantalla decenas de veces al día.
- **Sí:** reutilizar `ControlledInput` tal como está, aunque tenga `bg-white` y `text-slate-400` fijos en vez de tokens semánticos. Arreglarlo afecta a todos los formularios del proyecto y merece su propio spec; usar un input distinto solo en el login dejaría dos estilos de campo conviviendo.
- **Sí:** `LoginCard` en `views/auth/` como componente presentacional puro, con toda la lógica en `useLogin`. Es la convención de `CLAUDE.md`: los hooks de dominio concentran el estado, las rutas y las vistas solo pintan.
- **No:** `Suspense` + `ErrorBoundary` en esta pantalla. El login es una mutación (`useExecuteMutation`), no un `useSuspenseQuery`: el error es parte de la UI del formulario, no una pantalla de fallo.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `VITE_API_URL` sin esquema (`localhost:4000`) hace que `fetch` trate la URL como relativa y toda petición devuelva el 404 del dev server. | El paso 1 del plan fija `http://localhost:4000` en `.env` y queda documentado arriba. Si el login responde 404 con un HTML de Vite, es esto. |
| CORS: el front en `:3000` pidiendo a `:4000` es cross-origin. Si el backend no habilita el origen, el `fetch` falla antes de llegar a `parseResponse`. | El front no puede resolverlo. Se cubre con el mensaje "No se pudo contactar al servidor." para que el fallo sea legible, y se verifica contra el backend real en el paso 13. |
| `beforeLoad` corre en el servidor, donde no hay `localStorage`: el portal se renderiza en SSR como si hubiera sesión y solo se redirige al hidratar. | La comprobación va tras `typeof window !== 'undefined'`. El efecto visible es un parpadeo del layout antes del redirect en la primera carga sin sesión. Aceptable para una app interna; eliminarlo requeriría el token en cookie, fuera de alcance. |
| Token expirado: el usuario está "dentro" hasta que dispara una petición. | El interceptor de 401 limpia la sesión y lleva a `/login` en la primera petición autenticada que falle. Hoy el efecto es casi invisible porque los hooks de dominio siguen devolviendo mocks y no hacen peticiones. |
| El interceptor de 401 recarga la página con `window.location.assign` y se pierde trabajo sin guardar (por ejemplo una muestra a medio capturar en `/control-calidad`). | Se acepta: un 401 significa que ya no hay sesión válida y no hay a dónde guardar. El JWT dura 8 horas según el `exp` del ejemplo, más que un turno de planta. |
| `localStorage` corrupto o a medias (`auth_token` sin `auth_user`). | `leerSesion()` devuelve `null` y limpia ambas claves. No se admite media sesión. |
| `localStorage` no disponible (modo privado, SSR). | Todo va en `try/catch` con guarda de `typeof window`. El login funciona pero la sesión no sobrevive a la recarga: el usuario vuelve a `/login`. |
| El backend renombra `accessToken` o `complete_name`. | El tipado no lo detecta en runtime: llegaría `undefined` y la sesión se guardaría vacía. `iniciarSesion` verifica que `accessToken` y `user.id` existan antes de guardar, y si no, trata la respuesta como error. |
| El JWT queda en `localStorage` y es legible por cualquier script inyectado. | Decisión asumida arriba. El scope de daño está acotado por la expiración de 8 h del token. |

---

## Lo que **no** entra en este spec

- Refresh token y renovación silenciosa.
- Validar la sesión contra `/auth/me` o leer el `exp` del JWT en el front.
- Recuperar o cambiar contraseña, registro de usuarios.
- "Recordarme" / sesión efímera.
- Autorización por rol: ocultar rutas, menús o acciones.
- El rol del login sustituyendo al PIN de supervisor del bloqueo crítico.
- Cablear los hooks de dominio que hoy devuelven mocks al backend real.
- Migrar `ControlledInput` a los tokens semánticos de `styles.css`.

Cada uno de ellos, si se hace, va en su propio spec.
