# SPEC 25 — Refresh token contra el backend real

> **Estado:** Approved
> **Depende de:** SPEC 06 (capa HTTP con refresh y reintento del 401), SPEC 14 (contraseña vencida), SPEC 50 del backend (`core-control-calidad-agro-backend/specs/50-refresh-token.md`), implementado en la rama `spec-50-refresh-token` del backend
> **Fecha:** 2026-11-06
> **Objetivo:** Alinear el refresh que dejó listo el SPEC 06 con el contrato real de `POST /auth/refresh` del SPEC 50 del backend, para que la sesión se renueve sola y el operario no vuelva a ingresar cada 8 horas.

---

## Por qué existe este spec

El SPEC 06 construyó todo el mecanismo contra un endpoint que todavía no existía:

- `refrescarSesion()` con *single-flight*;
- el reintento único del 401 en la fachada (`conPoliticaDe401`);
- `refreshToken` guardado en `localStorage` bajo `auth_refresh`;
- los tests de `refresh-token.test.ts`.

Hasta hoy, cada refresh fallaba con 404 y el front caía al cierre de sesión de siempre.

El SPEC 50 del backend ya define el endpoint, y su contrato difiere del que supuso el SPEC 06 en tres puntos:

1. **El token viaja solo en el body** `{ refreshToken }`. El front además lo manda como `Authorization: Bearer`, que sobra.
2. **Rotar no invalida el refresh anterior.** `RefreshResponse` dice lo contrario en su comentario.
3. **`POST /auth/login` puede devolver `refreshToken: null`**, cuando el servidor no tiene `JWT_REFRESH_SECRET`. El tipo lo declara como `string` opcional.

Además, `CLAUDE.md` y los JSDoc siguen diciendo que el endpoint "todavía no existe".

Este spec es chico a propósito: ajusta el contrato, documenta cómo se comporta el front ante cada respuesta del endpoint y actualiza el manual. La política del 401 no cambia.

## Alcance

**Entra:**

- `refresh-token.ts`: `POST /auth/refresh` con body `{ refreshToken }` y **sin** cabecera `Authorization`.
- `auth.types.ts`: `LoginResponse.refreshToken` pasa a `string | null` (opcional), y `RefreshResponse.refreshToken` a `string` obligatorio. Se corrige el comentario de la rotación.
- `useAuth.tsx`: un `refreshToken: null` del login no deja nada en `auth_refresh`.
- Tests en `refresh-token.test.ts`:
  - forma de la petición del refresh;
  - cierre de sesión ante 401, 403 y 503 del refresh;
  - cierre de sesión ante un fallo de red del refresh, que documenta la decisión tomada.
- JSDoc de `refresh-token.ts` y `http-client.ts`, y `CLAUDE.md` (sección Cliente HTTP).
- Manual de usuario: solución de problemas (usuario inactivo, por qué el sistema lo devuelve al ingreso) y una línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Conservar la sesión cuando el refresh falla por red, timeout o 5xx. Hoy cualquier fallo del refresh cierra la sesión, y se mantiene así por decisión (ver Decisiones).
- Mostrar en el login el motivo por el que se cerró la sesión (usuario inactivo, contraseña vencida). Se mantiene el login limpio.
- Refresh proactivo, antes de que venza el access token.
- Coordinar el refresh entre pestañas. No hace falta mientras el backend no revoque el refresh anterior.
- Botón o pantalla de "cerrar sesión en todos los dispositivos". El backend no tiene revocación.
- Mover los tokens a cookie `httpOnly`.

## Modelo de datos

No hay claves nuevas en `localStorage`. Siguen `auth_token`, `auth_user`, `auth_refresh` y `auth_permisos`.

Tipos en `src/presentation/types/auth/auth.types.ts`:

```ts
export interface LoginResponse {
    ok: boolean
    msg: string
    user: Usuario
    accessToken: string
    /** SPEC 50 del backend. `null` si el servidor no tiene JWT_REFRESH_SECRET: no hay renovación. */
    refreshToken?: string | null
    passwordVencida?: boolean
}

/** `POST /auth/refresh`. Rota el par, pero el refresh anterior sigue valiendo hasta su vencimiento. */
export interface RefreshResponse {
    ok: boolean
    msg: string
    accessToken: string
    refreshToken: string
}
```

`Sesion.refreshToken?: string` no cambia: en la sesión, "sin refresh" es la ausencia de la clave, nunca `null`.

Petición que sale del front:

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<refresh guardado en auth_refresh>" }
```

Cómo reacciona el front a cada respuesta (la política del SPEC 06, sin cambios):

| Respuesta de `/auth/refresh` | Qué pasa |
| --- | --- |
| 200 | `guardarTokens` guarda los dos tokens y la petición original se reintenta una vez con el access nuevo |
| 401 (token inválido o vencido, usuario borrado, usuario inactivo) | `cerrarSesionYSalir()`: limpia la sesión y va a `/login` |
| 403 (contraseña vencida) | lo mismo; al ingresar, el usuario cae en el `ExpiredPasswordDialog` de siempre |
| 503 (refresh no configurado en el servidor) | lo mismo |
| Red, timeout u otro 5xx | lo mismo (decisión de este spec) |
| No hay `auth_refresh` guardado | cierra sesión sin llamar al endpoint, como hoy |

Quien hizo la petición original recibe **su** 401, no el error del refresh. Eso tampoco cambia.

## Plan de implementación

1. **Tipos.** En `auth.types.ts`, aplicar los cambios del modelo de datos. En `useAuth.tsx`, guardar `refreshToken: respuesta.refreshToken ?? undefined` en lugar de `?? ''`. El comportamiento ya era el mismo, porque `guardarSesion` borra `auth_refresh` ante un valor falsy, pero así el tipo dice la verdad. Correr `npx tsc --noEmit`.
2. **Petición del refresh.** En `refresh-token.ts`, quitar `{ headers: { Authorization: ... } }` de `clienteRefresh.post`. El body `{ refreshToken }` ya estaba. Reescribir el JSDoc del módulo: el endpoint existe (SPEC 50 del backend), consulta al usuario en cada llamada y rotar no invalida el refresh anterior. Borrar el comentario de "un backend que emita el access nuevo sin rotar el refresh": el SPEC 50 siempre rota, pero `guardarTokens` sigue tolerándolo.
3. **Tests de la petición.** En `refresh-token.test.ts`, hacer que `instalarFetchFalso` registre también el body de cada petición. Agregar un caso: el `POST /auth/refresh` lleva `{ refreshToken: 'refresh-viejo' }` y no lleva `Authorization`.
4. **Tests de las respuestas.** Agregar casos para un refresh que responde 403 con `passwordVencida: true`, uno que responde 503 y uno que rechaza por red (el `fetch` falso lanza un `TypeError`). En los tres se cierra la sesión, se va a `/login` y quien llamó recibe el 401 original. El caso de red lleva un comentario que remite a la decisión de este spec.
5. **Comentarios de la fachada.** En `http-client.ts`, el JSDoc de `conPoliticaDe401` deja de decir "que es el estado de hoy" sobre la falta de refresh token. Ahora es el caso de un servidor sin `JWT_REFRESH_SECRET` o de una sesión anterior a este spec.
6. **Manual** (`docs/manual/MANUAL.md`), en el capítulo de solución de problemas:
   - Ampliar **"El sistema me devolvió a la pantalla de ingreso."** con los motivos, sin jerga: más de 30 días sin usar el sistema, el administrador desactivó su usuario o restableció su contraseña, o su contraseña venció.
   - Agregar **"Al ingresar aparece "El usuario esta inactivo"."**: el usuario fue desactivado y tiene que hablar con el administrador del sistema.
   - Agregar una línea en **Sin publicar**: la sesión se mantiene abierta mientras se use el sistema, sin volver a ingresar cada jornada.
   - No hay capturas afectadas.
7. **Memoria.** En `CLAUDE.md`, sección Cliente HTTP, viñeta `refresh-token.ts`:
   - el contrato real (body, sin `Authorization`, SPEC 50 del backend);
   - que el refresh anterior no se invalida;
   - la tabla de reacciones resumida en una línea: todo fallo del refresh cierra la sesión.

   Borrar "El endpoint todavía no existe en el backend". Actualizar la línea de tests del cliente si cambió lo que cubren.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run test` pasan.
- [ ] Contra el backend con el SPEC 50 y `JWT_REFRESH_SECRET` configurada, después de ingresar existe `auth_refresh` en `localStorage`.
- [ ] Con la pantalla abierta, cambiar a mano `auth_token` por un texto cualquiera y navegar a otra pantalla: en la pestaña Red de DevTools se ve un solo `POST /auth/refresh`, la pantalla carga sin volver al ingreso, y `auth_token` y `auth_refresh` tienen valores nuevos.
- [ ] Ese `POST /auth/refresh` lleva el body `{ "refreshToken": ... }` y **no** lleva cabecera `Authorization`.
- [ ] Con dos peticiones en paralelo y el token roto (por ejemplo, la portada), sale un solo `POST /auth/refresh`.
- [ ] Una descarga o impresión de PDF del servicio de reportes con el token roto renueva la sesión contra el API y se reintenta.
- [ ] Poniendo `isActive = 0` al usuario en la base y rompiendo `auth_token`, la siguiente navegación lleva a `/login` con la sesión limpia.
- [ ] Ingresar con ese usuario inactivo y la contraseña correcta muestra *"El usuario esta inactivo"* en el banner del login.
- [ ] Contra un backend sin `JWT_REFRESH_SECRET`, el ingreso funciona, `auth_refresh` no existe, y romper `auth_token` lleva a `/login` sin llamar a `/auth/refresh`.
- [ ] Contra un backend sin el SPEC 50 (sin el endpoint), el ingreso funciona igual que antes de este spec.
- [ ] El manual tiene las dos entradas de solución de problemas y la línea en **Sin publicar**.

## Decisiones

- **Sí:** el refresh token viaja solo en el body. Es el contrato del SPEC 50. La cabecera `Authorization` sobraba, y quitarla deja claro que la ruta es pública.
- **No:** mandarlo en los dos lados "por compatibilidad". El backend ignora la cabecera en una ruta `@Public()`, pero mandar el refresh como `Bearer` es justo lo que el diseño del SPEC 50 quiere evitar.
- **Sí:** todo fallo del refresh cierra la sesión, también los de red, timeout y 5xx. Decisión explícita del usuario: mantiene la política del SPEC 06 tal cual y no agrega casos a la fachada.
- **No:** conservar la sesión cuando el refresh falla por red y dejar que TanStack Query reintente. Evitaría sacar al operario a mitad de un pesaje con mala señal, pero se deja fuera por ahora. Si se ve en planta, va en su propio spec.
- **Sí:** el login queda limpio después de un cierre de sesión por refresh rechazado. Decisión explícita del usuario. El motivo aparece cuando el usuario intenta ingresar: *"El usuario esta inactivo"* en el banner, o el `ExpiredPasswordDialog` si la contraseña venció.
- **No:** guardar el motivo del cierre en `sessionStorage` para pintarlo en el login. Es comodidad, y el ingreso ya lo explica.
- **Sí:** `LoginResponse.refreshToken` es `string | null` y opcional. `null` es el caso del servidor sin secreto, y que sea opcional cubre a un backend sin el SPEC 50.
- **Sí:** no hay coordinación entre pestañas. Dos pestañas que renuevan a la vez reciben dos pares válidos, porque el backend no revoca el refresh anterior. La que escribe última gana en `localStorage` y las dos siguen funcionando.
- **Sí:** no hay refresh proactivo. Renovar al primer 401 alcanza con un access token de 8 horas y no agrega timers.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con mala señal, el refresh falla por red y el operario vuelve al ingreso en mitad de un pesaje | **Aceptado por decisión.** Sólo ocurre cuando el access token vence, una vez cada 8 horas de uso. Los pesajes guardados no se pierden. Si se repite en planta, conservar la sesión ante un fallo de red es un spec chico sobre `conPoliticaDe401`. |
| El servicio de reportes rechaza el access token nuevo | Comparte `JWT_SECRET` con el API (mismo `.env` del tenant). Un criterio de aceptación lo verifica. |
| Una pestaña se queda con un refresh "viejo" después de que otra rotó | No es un fallo: el backend no lo revoca. Si algún día se agrega revocación con detección de reuso, este punto pasa a ser un spec de coordinación entre pestañas. |
| El front se despliega antes que el backend con el SPEC 50 | Sin el endpoint, el refresh responde 404 y se cierra la sesión, igual que hoy. El orden de despliegue no importa. |

## Lo que **no** entra en este spec

- Conservar la sesión ante un fallo de red del refresh.
- El motivo del cierre de sesión en la pantalla de ingreso.
- Refresh proactivo.
- Coordinación del refresh entre pestañas.
- Cerrar sesión en todos los dispositivos.
- Tokens en cookie `httpOnly`.

Cada uno de esos, si llega, va en su propio spec.
