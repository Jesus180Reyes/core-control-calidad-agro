# SPEC 06 — Migración de la capa HTTP al patrón del template auditado

> **Estado:** Approved
> **Depende de:** SPEC 02, SPEC 03
> **Fecha:** 2026-08-28
> **Objetivo:** Reestructurar `src/infrastructure/http/` por responsabilidad y transplantarle las cuatro capacidades que le faltan frente al template auditado en producción —refresh token con reintento del 401, aplanado de los errores de validación de Zod, transporte `blob` para PDF y transporte multipart para archivos— sin romper ninguna llamada existente.

---

## Por qué existe este spec

`api-template/` es la capa HTTP de un proyecto ya auditado en producción. No se puede copiar tal cual: importa `../../utils/getEnv` y `../../../Redux/store`, inyecta headers de Cloudflare Access y un parámetro `database` multi-tenant, y guarda el JWT en `sessionStorage`. Nada de eso existe acá y no compilaría.

Pero tiene cuatro piezas que este proyecto no tiene y va a necesitar:

- **`refresh/refresh_token.ts`** — refresh del access token con *single-flight* (`isRefreshing` + `refreshPromise`) y **reintento de la petición original**. Hoy acá un 401 con token cierra la sesión y manda al operario a `/login` en mitad de un pesaje (`interceptores-auth.ts:42`).
- **`error_handler.ts`** — aplana el array de errores de Zod que devuelve el backend (`{ message: { errors: [{ path, message }] } }`) a texto legible. Hoy `mensajeDelServidor` (`http-errors.ts:104`) solo lee un `message` que sea string: contra un 400 de validación devuelve `null` y el toast cae al texto genérico.
- **`queryPdfAbstraction.ts` / `mutationPdfAbstraction.ts`** — respuesta binaria. `parsearRespuesta` (`create-http-client.ts:95`) solo sabe de `json` y `text`; un PDF hoy llega como string corrupto.
- **`mutationMultipartAbstraction.ts` + `useExecuteFilesMutation.tsx`** — armado de `FormData`. El cliente ya detecta `body instanceof FormData` y omite el `Content-Type` (`create-http-client.ts:124`), pero nadie arma el `FormData`.

En la dirección contraria, el cliente de SPEC 03 tiene lo que el template no: jerarquía de errores tipada, `timeoutMs` combinado con el `AbortSignal` de quien llama, interceptores y un único lugar donde se arma la petición. El template repite el bloque `fetch` + headers + manejo del 401 en **cinco** archivos. Por eso la migración es un transplante hacia el cliente actual, no un reemplazo.

La reestructura de carpetas viene con el paquete: hoy `infrastructure/http/` son cinco archivos planos y con las piezas nuevas serían diez, sin jerarquía que separe el núcleo puro de lo que toca la sesión.

---

## Alcance

**Dentro:**

- Reestructura de `src/infrastructure/http/` en `core/`, `interceptores/`, `transportes/` y la fachada `http-client.ts`.
- `core/config-http.ts`: `BASE_URL` y `TIMEOUT_POR_DEFECTO_MS` leídos una sola vez de `import.meta.env`.
- Aplanado de los errores de validación de Zod dentro de `mensajeDelServidor`.
- `interceptores/refresh-token.ts`: `refrescarSesion()` con single-flight, contra `POST /auth/refresh`.
- Reintento del 401 en la fachada: `http-client.ts` envuelve `api.request`. `core/create-http-client.ts` **no** aprende a reintentar.
- `interceptores/interceptores-auth.ts` se reduce a inyectar el `Bearer`; la política del 401 (refresh → reintento → logout) pasa entera a la fachada.
- `refreshToken` opcional en `LoginResponse` y `Sesion`, persistido en `localStorage` junto al `accessToken`.
- Opción `parsear: 'json' | 'blob'` en `HttpRequestOptions`, con `parsearRespuesta` extraído a `transportes/respuesta-json.ts` y `transportes/respuesta-blob.ts` nuevo.
- `transportes/cuerpo-multipart.ts` con `aFormData(objeto)`.
- Hooks nuevos `useExecuteFilesMutation` y `useExecutePdfMutation` en `presentation/hooks/shared/`.
- Tests de vitest de `refresh-token.ts` y del wrapper de reintento.
- Borrado de `api-template/` del repositorio.
- Actualización de la sección "Cliente HTTP" de `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- **Construir el endpoint `POST /auth/refresh` del backend.** Es trabajo del API; este spec deja el front listo y degradado.
- Headers de Cloudflare Access (`CF-Access-Client-Id` / `CF-Access-Client-Secret`), `api-key` y `ngrok-skip-browser-warning`.
- El parámetro `database` multi-tenant y `useExecuteDinamicDbMutation`. No hay Redux ni multi-tenant en este proyecto.
- `getEnv` asíncrono. Acá las variables entran por `import.meta.env` en build time.
- Cambiar la firma de `useExecuteQuery` / `useExecuteMutation` a la del template (`runMutation(url, body)`). Los cuatro hooks de dominio siguen llamando igual que hoy.
- Pantallas que consuman PDF o subida de archivos. Este spec entrega el transporte y el hook, no una vista.
- `refetchInterval` como parámetro posicional. Ya funciona: `useExecuteQuery` esparce `queryOptions` sobre `useSuspenseQuery`.
- Tests de `create-http-client`, `query-params` y los transportes. La deuda que SPEC 03 anotó sigue anotada.
- Pintar los errores de validación campo por campo en el formulario (`setError` de react-hook-form).

---

## Estructura final

```
src/infrastructure/http/
├─ core/                        ← puro: no importa de #/presentation ni del router
│  ├─ create-http-client.ts
│  ├─ http-errors.ts
│  ├─ query-params.ts
│  └─ config-http.ts            (nuevo)
├─ interceptores/               ← lo único que conoce la sesión y /login
│  ├─ interceptores-auth.ts
│  └─ refresh-token.ts          (nuevo)
├─ transportes/                 ← puro: cómo se lee el cuerpo de una respuesta
│  ├─ respuesta-json.ts         (extraído de create-http-client)
│  ├─ respuesta-blob.ts         (nuevo)
│  └─ cuerpo-multipart.ts       (nuevo)
└─ http-client.ts               ← fachada pública: instancia, reintento y re-exports

src/presentation/hooks/shared/
├─ useExecuteQuery.ts           (sin cambios)
├─ useExecuteMutation.ts        (sin cambios)
├─ useExecuteFilesMutation.ts   (nuevo)
└─ useExecutePdfMutation.ts     (nuevo)
```

La frontera de SPEC 03 se mantiene y ahora es visible en el árbol: `core/` y `transportes/` no importan nada de `#/presentation`; `interceptores/` sí.

Fuera de `infrastructure/`, el movimiento afecta a **cinco** imports en total: cuatro hooks entran por `#/infrastructure/http/http-client` y no cambian; solo `query-client/query-client.ts:2` pasa de `http/http-errors` a `http/core/http-errors`.

---

## Contrato del refresh

**`POST /auth/refresh`** — el mismo del template auditado.

Request:

```
Authorization: Bearer <refreshToken>
Content-Type: application/json

{ "refreshToken": "<refreshToken>" }
```

Response:

```json
{
    "accessToken": "<nuevo access>",
    "refreshToken": "<nuevo refresh>"
}
```

Con rotación: el `refreshToken` viejo queda invalidado del lado del backend y el front persiste el nuevo. El endpoint **todavía no existe**; hasta que exista, cada intento de refresh falla y el front degrada al comportamiento de hoy (limpiar sesión + `/login`).

`POST /auth/login` suma `refreshToken` al body de respuesta. Se declara **opcional** para que el login contra el backend actual —que no lo manda— siga funcionando sin cambios.

---

## Modelo de datos

### Tipos modificados — `src/presentation/types/auth/auth.types.ts`

```ts
export interface LoginResponse {
    ok: boolean
    msg: string
    user: Usuario
    accessToken: string
    /** Opcional hasta que el backend lo emita (ver SPEC 06). */
    refreshToken?: string
}

export interface Sesion {
    accessToken: string
    usuario: Usuario
    refreshToken?: string
}
```

### Tipos nuevos — `src/infrastructure/http/core/http-errors.ts`

Espejan el wire format del backend, tal cual `api-template/types/zodErrors.ts`:

```ts
/** Un ítem del array que emite el ValidationPipe de Zod en el backend. */
export interface ErrorValidacion {
    code: string
    message: string
    path: string[]
}
```

`HttpError` **no** cambia de forma: sigue con `status` y `body`. El array se lee desde `body` dentro de `mensajeDelServidor`.

### Persistencia — `almacenamientoSesion.ts`

Tercera clave en `localStorage`, junto a las dos de hoy:

```ts
const CLAVE_TOKEN = 'auth_token'
const CLAVE_USUARIO = 'auth_user'
const CLAVE_REFRESH = 'auth_refresh'   // nueva
```

`limpiarStorage` borra las tres. `leerSesion` **no** exige `CLAVE_REFRESH`: una sesión sin refresh token es válida (es la de hoy). No hay versionado ni migración: una sesión guardada antes de este spec sigue leyéndose igual, sin `refreshToken`.

### Estado de módulo — `refresh-token.ts`

```ts
/** Refresh en vuelo. Su existencia ES la bandera: dos 401 simultáneos comparten la misma promesa. */
let refrescoEnVuelo: Promise<string> | null = null
```

---

## Plan de implementación

Cada paso deja el proyecto compilando y la suite de vitest en verde.

1. **Mover los archivos a la estructura nueva, sin cambiar una línea de lógica.**
   `create-http-client.ts`, `http-errors.ts` y `query-params.ts` a `core/`; `interceptores-auth.ts` a `interceptores/`; `http-client.ts` se queda en la raíz. Actualizar los imports internos y el de `query-client/query-client.ts`. Los cuatro imports de `#/presentation` no se tocan.
   Verificación: `npx tsc --noEmit` pasa y `npx vitest run` sigue en verde.

2. **Crear `core/config-http.ts`.**
   ```ts
   export const BASE_URL = import.meta.env.VITE_API_URL ?? ''
   export const TIMEOUT_POR_DEFECTO_MS = 15_000
   ```
   `http-client.ts` los consume en vez de leer `import.meta.env` inline. Existe para que `refresh-token.ts` apunte a la misma base sin importar la fachada (sería un ciclo) ni duplicar la lectura del env.
   Verificación: `npx tsc --noEmit` pasa; el login sigue pegándole a `VITE_API_URL`.

3. **Extraer `transportes/respuesta-json.ts`.**
   `parsearRespuesta<T>(response)` sale de `create-http-client.ts` tal cual, con su comentario sobre el `204` que devuelve `''` y el JSON inválido que devuelve `null`. `create-http-client` la importa. Comportamiento idéntico, cero cambios de contrato.
   Verificación: `npx tsc --noEmit` pasa.

4. **Aplanar los errores de Zod en `mensajeDelServidor`** (`core/http-errors.ts`).
   Suma el tipo `ErrorValidacion` y una rama: si `body.message` es un objeto con `errors` array, mapea cada ítem a `• ${path.join('.')}: ${message}` y los une con `\n`. Si el array viene vacío, devuelve `null` para que quien llama caiga a su texto por defecto. La rama del `message` string queda **primera** y sin tocar.
   Verificación: `npx tsc --noEmit` pasa. Manual: un `POST /pesajes` con body inválido pinta el toast rojo con el campo que falló.

5. **Persistir el refresh token** (`almacenamientoSesion.ts` + `auth.types.ts` + `useAuth.tsx`).
   - `auth.types.ts`: `refreshToken?: string` en `LoginResponse` y en `Sesion`.
   - `almacenamientoSesion.ts`: `CLAVE_REFRESH`; `guardarSesion` la escribe si viene y la borra si no; `limpiarStorage` la incluye; `leerSesion` la lee sin exigirla; nuevas `leerRefreshToken(): string | null` y `guardarTokens({ accessToken, refreshToken })`, que actualiza los dos tokens **sin tocar** al usuario ni notificar a los suscriptores (un refresh no cambia quién está logueado; notificar dispararía un rerender de toda la app en mitad de una petición).
   - `useAuth.tsx`: `iniciarSesion` pasa `refreshToken: respuesta.refreshToken` a `guardarSesion`.
   Verificación: `npx tsc --noEmit` pasa. Manual: login contra el backend actual (sin `refreshToken`) sigue funcionando y `auth_refresh` no aparece en `localStorage`.

6. **Crear `interceptores/refresh-token.ts`.**
   - Cliente propio con `createHttpClient({ baseUrl: BASE_URL, timeoutMs: TIMEOUT_POR_DEFECTO_MS })`, **sin** interceptores de auth: si el refresh pegara por `api`, un 401 del propio refresh dispararía otro refresh.
   - `refrescarSesion(): Promise<string>` — si `refrescoEnVuelo` existe, la devuelve. Si no, arma la promesa: lee `leerRefreshToken()`, y si no hay lanza; hace el `POST /auth/refresh` con el header y el body del contrato; `guardarTokens(respuesta)`; devuelve el `accessToken` nuevo. En el `finally`, `refrescoEnVuelo = null`.
   - `hayRefreshToken(): boolean` para que la fachada decida sin capturar excepciones.
   Verificación: `npx tsc --noEmit` pasa.

7. **Reducir `interceptores/interceptores-auth.ts` a la inyección del token.**
   - Se va el `onError` con `limpiarSesion()` + `window.location.assign('/login')`: esa política se muda entera al paso 8. Si se quedara, la sesión quedaría borrada **antes** de que el refresh alcance a usarla.
   - Se va la bandera `LLEVABA_TOKEN` de `ctx.meta`: el core copia `meta` (`create-http-client.ts:186`), así que lo que el interceptor escriba nunca vuelve a quien llamó.
   - En su lugar exporta `peticionLlevaToken(headers?: HeadersInit): boolean` — `true` si quien llama no trajo su propio `Authorization` y `leerToken()` devuelve algo. El `onPeticion` y la fachada usan **la misma** función, así la regla vive en un solo lugar.
   - `yaRegistrados` (el `WeakSet` que protege del HMR) se mantiene.
   Verificación: `npx tsc --noEmit` pasa. Manual: las peticiones siguen saliendo con el `Bearer` (pestaña Network).

8. **Envolver `request` en la fachada `http-client.ts`.**
   `api` se crea igual, pero deja de exportarse `api.request` pelado:
   ```ts
   async function httpRequest<T>(endpoint, options) {
       try {
           return await api.request<T>(endpoint, options)
       } catch (error) {
           if (!esNoAutorizado(error)) throw error
           if (!peticionLlevaToken(options.headers)) throw error   // el login rebota con su 401 legítimo
           if (!hayRefreshToken()) { cerrarSesionYSalir(); throw error }
           try {
               await refrescarSesion()
           } catch {
               cerrarSesionYSalir()
               throw error   // el error original, no el del refresh
           }
           return await api.request<T>(endpoint, options)   // un solo reintento
       }
   }
   ```
   - El reintento vuelve a pasar por `onPeticion`, que lee `leerToken()` de nuevo y por lo tanto inyecta el token **nuevo**.
   - Un 401 en el reintento sale como error: no hay recursión ni segundo refresh.
   - `cerrarSesionYSalir()` hace `limpiarSesion()` + `window.location.assign('/login')`, con la guarda `typeof window !== 'undefined'` que hoy tiene el interceptor.
   - `httpGet` / `httpPost` / `httpPut` / `httpPatch` / `httpDelete` se redefinen **sobre `httpRequest`**, no sobre `api`. Si siguieran apuntando a `api.get`, las queries se quedarían sin refresh.
   - `api` se sigue exportando para casos sueltos, documentado como el cliente **sin** reintento.
   Verificación: `npx tsc --noEmit` pasa y `npx vitest run` sigue en verde.

9. **Tests de vitest: `src/infrastructure/http/interceptores/refresh-token.test.ts`.**
   Con `// @vitest-environment jsdom` (tocan `localStorage`) y `fetch` inyectado. `window.location.assign` no está implementado en jsdom: hay que stubearlo. Casos:
   - **Single-flight:** dos peticiones que reciben 401 a la vez producen **un solo** `POST /auth/refresh`, y las dos se reintentan con el token nuevo.
   - **Reintento exitoso:** 401 → refresh → segunda llamada con el `Bearer` nuevo → resuelve con los datos.
   - **Refresh fallido:** el refresh devuelve 401 → `limpiarSesion()` corrió, se navegó a `/login`, y quien llamó recibe el `HttpError` **original**.
   - **Sin refresh token:** un 401 no dispara ninguna petición a `/auth/refresh` y cierra sesión directo (el comportamiento de hoy).
   - **401 del login:** una petición sin token no dispara refresh ni cierra sesión.
   - **Sin bucle:** si el reintento vuelve a dar 401, hay exactamente dos peticiones al endpoint original y un refresh.
   Verificación: `npx vitest run src/infrastructure/http/interceptores/refresh-token.test.ts` pasa.

10. **Crear `transportes/respuesta-blob.ts` y la opción `parsear`.**
    - `HttpRequestOptions` suma `parsear?: 'json' | 'blob'` (`@default 'json'`). `request` elige el transporte según ese valor; todo lo demás —timeout, signal, interceptores, traducción de errores— es el mismo camino.
    - `parsearRespuestaBlob(response): Promise<Blob>` — fuera de 2xx lanza `HttpError` igual que la versión JSON. Con 2xx pero `content-type: application/json` **también** lanza `HttpError`: es el caso del template, donde el backend responde un error en JSON con status 200 en vez del PDF.
    Verificación: `npx tsc --noEmit` pasa y `npx vitest run` sigue en verde.

11. **Crear `transportes/cuerpo-multipart.ts`.**
    `aFormData(objeto: Record<string, unknown>): FormData`, con las tres reglas del template: `File`/`Blob` se anexan tal cual, un objeto no nulo va como `JSON.stringify`, el resto como `String(valor)`. `undefined` y `null` se **omiten**, coherente con `query-params.ts`.
    Verificación: `npx tsc --noEmit` pasa.

12. **Crear `presentation/hooks/shared/useExecuteFilesMutation.ts`.**
    Misma firma que `useExecuteMutation` (`endpoint` string o función de las variables, `options` con `method`), pero el `mutationFn` pasa las variables por `aFormData` antes de mandarlas. `Content-Type` no se toca: el cliente ya lo omite ante un `FormData` para que el navegador ponga el boundary.
    Verificación: `npx tsc --noEmit` pasa.

13. **Crear `presentation/hooks/shared/useExecutePdfMutation.ts`.**
    Sobre `useExecuteMutation` con `parsear: 'blob'`, `method` configurable (`GET` cubre lo que el template resolvía con `queryPdfAbstraction`). Devuelve `{ generar, generando, url }`, donde `url` es el `URL.createObjectURL(blob)` del último PDF. El hook **revoca** la URL anterior al generar otra y en el desmontaje: el template creaba una object URL por llamada y nunca la liberaba.
    Verificación: `npx tsc --noEmit` pasa.

14. **Borrar `api-template/` del repositorio.** Ya no queda nada por transplantar y el directorio no compila en este proyecto.
    Verificación: `npx tsc --noEmit` pasa y `npx vitest run` pasa completo.

15. **Actualizar `CLAUDE.md`.** Reescribir la sección "Cliente HTTP" con la estructura nueva (`core/` / `interceptores/` / `transportes/` / fachada), dejando explícito que el reintento del 401 vive en la fachada y **no** en `create-http-client`, que los atajos `httpGet`/`httpPost`/... son los que llevan refresh y `api` no, y que `refrescarSesion` es single-flight.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo, incluidos los tests nuevos de `refresh-token`.
- [ ] `src/infrastructure/http/` tiene exactamente las carpetas `core/`, `interceptores/` y `transportes/` más la fachada `http-client.ts`.
- [ ] Ningún archivo de `core/` ni de `transportes/` importa de `#/presentation` ni de `@tanstack/react-router` (verificable con `grep -rn "#/presentation\|react-router" src/infrastructure/http/core src/infrastructure/http/transportes`, que no devuelve nada).
- [ ] `useClientes`, `useLotes`, `usePesajes` y `useLogin` compilan **sin ningún cambio** en sus imports ni en sus llamadas.
- [ ] Login, `/clientes`, `/lotes-clientes` y guardar un pesaje funcionan igual que antes de este spec, contra el backend real.
- [ ] Un `POST /pesajes` con body inválido muestra en el toast rojo el campo y el mensaje que devolvió Zod (`• lote_id: Required`), no el texto genérico.
- [ ] Un error del backend con `message` string sigue mostrando ese string, sin viñetas.
- [ ] El login sigue funcionando contra un backend que **no** devuelve `refreshToken`: la sesión se guarda y no aparece `auth_refresh` en `localStorage`.
- [ ] Con un `refreshToken` en `localStorage` y el `accessToken` vencido, una petición cualquiera dispara `POST /auth/refresh`, guarda los dos tokens nuevos y **reintenta** la petición original con el `Bearer` nuevo. En Network se ven tres peticiones y ningún salto a `/login`.
- [ ] Dos peticiones en vuelo que reciben 401 al mismo tiempo generan **un solo** `POST /auth/refresh` (verificable en Network y en el test de single-flight).
- [ ] Con el endpoint `/auth/refresh` inexistente (estado de hoy), un 401 con token limpia la sesión y navega a `/login` — el comportamiento previo a este spec, sin excepciones sin capturar en consola.
- [ ] Un 401 del propio `POST /auth/login` **no** dispara refresh, **no** cierra sesión y muestra el mensaje de credenciales inválidas.
- [ ] Si el reintento vuelve a dar 401, no hay bucle: exactamente dos peticiones al endpoint original y un solo refresh.
- [ ] Los atajos `httpGet`/`httpPost`/`httpPut`/`httpPatch`/`httpDelete` pasan por el wrapper con refresh (verificable: un 401 en un GET de `useExecuteQuery` también reintenta).
- [ ] Una petición con `parsear: 'blob'` contra un endpoint que devuelve `application/pdf` resuelve con un `Blob` de tipo `application/pdf` y tamaño mayor a cero.
- [ ] Una petición con `parsear: 'blob'` contra un endpoint que responde `200` con `application/json` lanza `HttpError`, no devuelve un blob corrupto.
- [ ] `aFormData({ archivo: File, meta: { a: 1 }, nombre: 'x', vacio: null })` produce un `FormData` con tres entradas: el `File` tal cual, `meta` como JSON y `nombre` como string.
- [ ] Una mutación por `useExecuteFilesMutation` sale con `Content-Type: multipart/form-data; boundary=...` puesto por el navegador (no `application/json`).
- [ ] `useExecutePdfMutation` revoca la object URL anterior al generar un PDF nuevo y al desmontarse (verificable en `chrome://blob-internals`).
- [ ] El directorio `api-template/` ya no existe en el repositorio.
- [ ] La sección "Cliente HTTP" de `CLAUDE.md` describe la estructura y el reintento nuevos.

---

## Decisiones

- **Sí:** el cliente de SPEC 03 es la base y las piezas del template se transplantan encima. Decisión del usuario. El template repite el bloque `fetch` + headers + 401 en cinco archivos y no tiene timeouts, cancelación ni errores tipados; copiarlo tal cual sería cambiar un cliente mejor por uno peor para ganar cuatro capacidades.
- **No:** traer los headers de Cloudflare Access, `api-key` y `ngrok-skip-browser-warning`. Son de la infraestructura del otro proyecto. El día que hagan falta, entran como un interceptor de petición más, que es exactamente para lo que existe el registro de interceptores.
- **No:** traer el parámetro `database` ni `useExecuteDinamicDbMutation`. Dependen de Redux y de un backend multi-tenant; acá no hay ni uno ni otro.
- **No:** traer `getEnv` asíncrono. Vuelve `async` el armado de cada petición para leer una constante que Vite ya inyecta en build time.
- **No:** adoptar la firma del template en los hooks (`runMutation(url, body)`, `useExecuteQuery(url, queryKey, refetchInterval, params)`). Decisión del usuario: los cuatro hooks de dominio no se tocan. Además la firma actual tipa el body y la respuesta por genéricos, y la del template los deja en `Record<string, any>`.
- **Sí:** reestructurar en `core/` / `interceptores/` / `transportes/`. Decisión del usuario. La frontera que SPEC 03 declaró en un comentario ("los tres primeros no importan nada de `#/presentation`") pasa a estar en el árbol de archivos, donde es más difícil de violar por accidente.
- **Sí:** `core/config-http.ts`. Es un archivo que el usuario no eligió explícitamente, pero sin él `refresh-token.ts` tiene que releer `import.meta.env.VITE_API_URL` por su cuenta —dos fuentes para la misma base— o importar la fachada, que lo importa a él: ciclo.
- **Sí:** el reintento del 401 vive en la fachada, envolviendo `api.request`. Decisión del usuario. `create-http-client.ts` conserva su invariante ("los interceptores observan y reaccionan; nunca cortocircuitan"), sigue siendo instanciable contra otro API sin arrastrar el refresh, y el archivo más delicado del proyecto no se toca salvo por la opción `parsear`.
- **No:** un gancho `alReintentar` en el core. Es más potente y más parecido a axios, pero rompe una invariante que SPEC 03 documentó a propósito, y el único caso de uso hoy es el refresh.
- **No:** el refresh dentro del `queryFn` de los hooks. Dejaría sin refresh a cualquier llamada directa a `httpGet`/`httpPost` fuera de un hook.
- **Sí:** la política del 401 se muda entera del interceptor a la fachada. No pueden convivir: el `onError` de hoy llama a `limpiarSesion()` en cuanto ve el 401, y borraría el `refreshToken` justo antes de que la fachada intente usarlo.
- **Sí:** `peticionLlevaToken` exportada y usada por el `onPeticion` y por la fachada. La regla —"no trajo su propio `Authorization` y hay token guardado"— tiene que ser la misma en los dos lados; con dos copias, el día que una cambie el login empieza a cerrar sesión sobre su propio 401.
- **Sí:** un solo reintento. Un segundo refresh ante un 401 del reintento significa que el token nuevo tampoco sirve: insistir es un bucle contra el servidor.
- **Sí:** al fallar el refresh, quien llamó recibe el `HttpError` **original**, no el error del refresh. Le importa que su petición dio 401, no la mecánica interna de la renovación.
- **Sí:** el flujo de refresh se escribe completo aunque el endpoint no exista, con degradación a logout. Decisión del usuario. Mientras no exista, el `POST /auth/refresh` falla y el front hace exactamente lo de hoy; el día que el endpoint se publique, funciona sin tocar una línea del front.
- **No:** una bandera de entorno (`VITE_AUTH_REFRESH`) para prender el refresh. Sería una tercera configuración que hay que acordarse de cambiar, y el costo de no tenerla es un `POST` a un 404 en cada 401 —que hoy, sin `refreshToken` guardado, ni siquiera llega a salir.
- **Sí:** el contrato del refresh es el del template auditado (`Authorization: Bearer <refresh>` + body `{ refreshToken }` → `{ accessToken, refreshToken }`, con rotación). Decisión del usuario: es el que ya pasó auditoría y el backend se va a construir contra él.
- **Sí:** `refreshToken` opcional en `LoginResponse`. Declararlo obligatorio rompería el login contra el backend actual hasta que el API lo emita.
- **Sí:** el `refreshToken` va a `localStorage` junto al `accessToken`. Decisión del usuario. El template los parte entre `sessionStorage` y `localStorage`, lo que deja la sesión en dos storages con vidas distintas: cerrar la pestaña mata el refresh pero no el access.
- **Sí:** `guardarTokens` no notifica a los suscriptores. `useAuth` usa `useSyncExternalStore`; notificar en cada refresh rerenderizaría la app entera en mitad de una petición, para informar un cambio que el usuario no puede percibir.
- **Sí:** `refrescoEnVuelo` es una sola variable y su existencia es la bandera. El template usa dos (`isRefreshing` + `refreshPromise`) y las mantiene sincronizadas a mano.
- **Sí:** el refresh sale por un cliente propio sin interceptores de auth. Si saliera por `api`, su propio 401 dispararía otro refresh, que dispararía otro.
- **Sí:** el aplanado de Zod vive dentro de `mensajeDelServidor`. Decisión del usuario. `useLogin` y `usePesajes` ya lo llaman: los mensajes de validación aparecen en sus toasts sin tocar ningún hook de dominio.
- **No:** exponer el array estructurado en `HttpError` para pintar el error campo por campo con `setError`. Es útil, pero abre dos caminos para el mismo dato y no hay hoy ningún formulario que lo consuma. Va en su propio spec si aparece.
- **Sí:** un array de errores vacío devuelve `null`. Un string vacío como mensaje de error no le dice nada al operario; `null` deja que quien llama use su texto por defecto.
- **Sí:** `parsear: 'json' | 'blob'` como opción de `request`, y no una función `httpBlob` aparte. Un transporte distinto no justifica duplicar el timeout, el signal, los interceptores y la traducción de errores, que es lo que hace el template con sus cinco archivos.
- **Sí:** un 200 con `content-type: application/json` en una petición `blob` lanza `HttpError`. Es el caso que el template maneja: el backend responde el error en JSON con status 200 en vez del PDF. Sin esta rama, el front descarga un "PDF" que es un mensaje de error.
- **Sí:** el transporte devuelve un `Blob` y la object URL la crea el hook. El template devuelve un string de `URL.createObjectURL` desde la capa de transporte y nunca la revoca: cada PDF generado queda en memoria hasta recargar la página.
- **Sí:** `aFormData` omite `undefined` y `null`. El template los manda como los strings `"undefined"` y `"null"`, que el backend recibe como valores presentes. Además queda coherente con `query-params.ts`.
- **Sí:** tests solo de `refresh-token` y del wrapper. Decisión del usuario. Es la única pieza con estado compartido entre peticiones (`refrescoEnVuelo`), la que se rompe callada y en producción, y la que no se puede verificar a ojo.
- **No:** la suite completa del cliente HTTP. La deuda que SPEC 03 anotó sigue anotada; cerrarla es prácticamente otro spec de trabajo.
- **No:** `refetchInterval` como parámetro posicional al estilo del template. `useExecuteQuery` ya esparce `queryOptions` sobre `useSuspenseQuery`, así que `useExecuteQuery(key, url, { refetchInterval: 30_000 })` ya funciona. El template lo pide obligatorio y en minutos, lo que obliga a inventar un valor en cada llamada.
- **Sí:** se borra `api-template/`. Es material de referencia que no compila en este proyecto; dejarlo invita a importar desde ahí por error.
- **No:** los `console.log` del template (`[Body Params]`, `[Url To RUN MUTATION]`, `Blob Size`...). Imprimen el body de cada petición —credenciales incluidas— en la consola de producción.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El endpoint `/auth/refresh` no existe todavía: el front queda con código que nadie ejercita contra el backend real hasta que lo construyas. | Los tests del paso 9 lo ejercitan entero con `fetch` inyectado, incluido el camino de fallo. Y el camino degradado —el único activo hoy— es exactamente el comportamiento previo al spec, cubierto por su propio caso de test. |
| El backend implementa el refresh con un contrato distinto al que este spec fija y el front queda desalineado en silencio: el refresh falla y el operario ve el logout de siempre sin entender por qué. | El contrato está escrito arriba, campo por campo, y es el del template ya auditado. Si el API se aparta, el cambio en el front es un archivo (`refresh-token.ts`). |
| Mover cinco archivos y crear seis toca el módulo más delicado del proyecto. Un import mal resuelto puede pasar `tsc` y fallar en runtime. | El paso 1 es un movimiento **puro**, sin cambios de lógica, verificado por `tsc` y la suite antes de tocar nada más. Los pasos siguientes son aditivos sobre un árbol ya verde. |
| El reintento se dispara sobre una mutación no idempotente: un `POST /pesajes` que dio 401 se reintenta y podría crear dos registros. | Para que haya duplicado el backend tendría que haber procesado el POST **y** devuelto 401, que es contradictorio: el 401 se decide antes de tocar la base. El riesgo real es de idempotencia del backend, ya anotado en SPEC 05 por otra vía. |
| `guardarTokens` escribe en `localStorage` sin notificar: si otra parte de la app cacheó el `accessToken` viejo en memoria, sigue usándolo. | Nadie lo cachea. El único lector es el `onPeticion`, que llama a `leerToken()` en cada petición. El snapshot de `useAuth` solo se usa para saber **si** hay sesión y para mostrar el nombre, y ninguno de los dos cambia en un refresh. |
| Dos pestañas abiertas comparten `localStorage`: la pestaña A rota el refresh token y el que la pestaña B tiene en memoria queda invalidado. | `refrescarSesion` lee `leerRefreshToken()` en el momento de usarlo, no al montar, así que B toma el token que A acaba de escribir. La ventana de carrera es de milisegundos; si aparece en planta, el arreglo es escuchar el evento `storage`, y va en su propio spec. |
| El wrapper de la fachada agrega un `try/catch` en el camino de **toda** petición. Un bug ahí afecta a la app entera, no solo al 401. | El `catch` relanza el error original en todas las ramas menos la del reintento exitoso, y los tests del paso 9 cubren cada rama, incluida la de "no es un 401, relanzá". |
| `parsear: 'blob'` y el multipart no tienen consumidor: entra código sin ejercitar en producción. | Costo asumido y explícito: la decisión del usuario fue cerrar la infraestructura de una vez en vez de volver a mover archivos cuando aparezca la pantalla. Los criterios de aceptación de blob y multipart son verificables sin pantalla, contra un endpoint suelto. |
| Al borrar `api-template/` se pierde la referencia del proyecto auditado. | Sigue en el historial de git y en su repositorio de origen. Lo que valía la pena está transplantado y documentado acá, con el porqué de cada diferencia. |

---

## Lo que **no** entra en este spec

- Construir `POST /auth/refresh` en el backend.
- Headers de Cloudflare Access, `api-key` y `ngrok-skip-browser-warning`.
- El parámetro `database` multi-tenant y `useExecuteDinamicDbMutation`.
- `getEnv` asíncrono.
- Cambiar la firma de `useExecuteQuery` / `useExecuteMutation` a la del template.
- Pantallas que consuman PDF o subida de archivos.
- Pintar los errores de validación campo por campo en el formulario.
- Tests de `create-http-client`, `query-params` y los transportes.
- Sincronizar la sesión entre pestañas por el evento `storage`.

Cada uno de ellos, si se hace, va en su propio spec.
