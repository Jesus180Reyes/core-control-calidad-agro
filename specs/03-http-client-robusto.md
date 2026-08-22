# SPEC 03 — Cliente HTTP instanciable con interceptores y errores tipados

> **Estado:** Implemented
> **Depende de:** SPEC 02
> **Fecha:** 2026-08-22
> **Objetivo:** Reemplazar el módulo de funciones sueltas de `http-client.ts` por un cliente creado con un factory configurable, con timeout, interceptores registrables desde fuera y errores tipados, sin cambiar la firma de `httpGet`/`httpPost`/... que ya consumen los hooks.

---

## Por qué existe este spec

`src/infrastructure/http/http-client.ts` tiene 117 líneas y funciona, pero acumula cuatro problemas concretos que se pagan en cuanto el proyecto conecte los hooks de dominio al backend real:

1. **Efectos secundarios dentro del parser.** `parseResponse` (`http-client.ts:39`) llama a `limpiarSesion()` y a `window.location.assign('/login')`. La capa de infraestructura importa `#/presentation/hooks/auth/almacenamientoSesion` — una dependencia que apunta hacia arriba, contra la dirección de las capas — y además conoce la ruta `/login`. Cambiar el comportamiento del 401 obliga a editar el archivo.

2. **El fallo de red no está tipado.** Si `fetch` rechaza (backend caído, CORS, DNS), sale un `TypeError` crudo. `useLogin.tsx:21` lo distingue **por descarte**: "si no es `HttpError`, entonces no se pudo contactar al servidor". Un `TypeError` por un bug de código produce hoy el mensaje "No se pudo contactar al servidor.".

3. **No hay timeout.** Una petición contra un backend que acepta la conexión y nunca responde se queda en vuelo para siempre. Con `useSuspenseQuery` eso significa un `<Suspense>` colgado indefinidamente, sin error y sin `ErrorBoundary`.

4. **Configuración global e inmutable.** `BASE_URL` se resuelve en el import (`http-client.ts:3`). No hay forma de crear un segundo cliente contra otro API, ni de sustituir el `fetch` en un test sin pisar el global.

Este spec no persigue features nuevas: persigue que el archivo más crítico de la capa de datos deje de ser una función y pase a ser una pieza configurable con puntos de extensión.

---

## Alcance

**Dentro:**

- Factory `createHttpClient(config)` en un archivo propio, sin ninguna dependencia de sesión ni de routing.
- Instancia por defecto `api` en `http-client.ts`, y los atajos `httpGet`/`httpPost`/`httpPut`/`httpPatch`/`httpDelete`/`httpRequest` como re-exports de esa instancia.
- Timeout de 15 s por defecto, sobreescribible por petición, combinado con el `AbortSignal` de quien llama.
- Sistema de interceptores: `onPeticion`, `onRespuesta`, `onError`, cada registro devuelve su función de baja.
- Jerarquía de errores tipados: `ErrorHttpBase`, `HttpError`, `NetworkError`, `TimeoutError`, `RequestCancelado`, más helpers de discriminación.
- Módulo `interceptores-auth.ts` con la inyección del `Bearer` y el manejo del 401, registrado sobre la instancia `api` en `http-client.ts`.
- Construcción de query params con arrays, `Date` y omisión de `undefined`/`null`.
- URLs absolutas (`http://…`) pasan sin prefijo de `baseUrl`, y la unión `baseUrl` + `endpoint` no produce barras dobles.
- Política de reintentos en `query-client.ts` basada en los helpers de error: nunca ante 4xx, sí ante fallo de red, timeout, 408, 429 y 5xx.
- `useLogin.tsx` migrado a los helpers tipados en vez del descarte por `instanceof`.
- Actualización de la sección `infrastructure/` de `CLAUDE.md`.
- `src/routes/__root.tsx` no se toca.

**Fuera de alcance (para specs futuros):**

- **Tests de vitest del cliente.** Decisión explícita del usuario: este spec no crea `http-client.test.ts`. La verificación es manual más `npx tsc --noEmit` y la suite existente en verde.
- **Parseo robusto de la respuesta.** El `204 No Content` seguirá devolviendo `''` casteado a `T`, y un JSON inválido en un 200 seguirá cayendo a `null`. `parseResponse` se mueve de archivo pero **no cambia de comportamiento**.
- Reintentos dentro del cliente HTTP. Viven en TanStack Query, no en `createHttpClient`.
- Refresh token y cola de peticiones en vuelo. El backend no expone `/auth/refresh` (SPEC 02).
- Validación de la respuesta con zod.
- Deduplicación de peticiones en vuelo, caché propia o `stale-while-revalidate` en el cliente. Eso ya lo hace TanStack Query.
- Subida de archivos con progreso (`XMLHttpRequest`), descarga de blobs, `responseType`.
- Telemetría, logging estructurado o `X-Request-Id`.
- Un segundo cliente contra otro API. El factory lo habilita; este spec no crea ninguno.
- Cablear los hooks de dominio que hoy devuelven mocks (`useControlCalidad`, `useParametros`).

---

## Modelo de datos

No hay datos de negocio nuevos ni persistencia nueva. Lo que se introduce son los tipos de la propia infraestructura.

### Errores — `src/infrastructure/http/http-errors.ts`

```ts
/** Raíz común: permite `catch (e) { if (e instanceof ErrorHttpBase) … }`. */
export abstract class ErrorHttpBase extends Error {}

/** El servidor respondió con un status fuera de 2xx. */
export class HttpError extends ErrorHttpBase {
    readonly status: number
    readonly body: unknown
}

/** `fetch` rechazó: backend caído, CORS, DNS. No hay respuesta. */
export class NetworkError extends ErrorHttpBase {
    readonly causa: unknown
}

/** Venció el `timeoutMs` del cliente. */
export class TimeoutError extends ErrorHttpBase {
    readonly timeoutMs: number
}

/** Quien llamó abortó (desmontaje del componente, cambio de ruta). */
export class RequestCancelado extends ErrorHttpBase {}
```

`HttpError` conserva **exactamente** la forma de hoy (`message`, `status`, `body`, `name === 'HttpError'`) para no romper `useLogin.tsx:22`.

Helpers exportados del mismo archivo:

```ts
esHttpError(e): e is HttpError
esNoAutorizado(e): boolean     // 401
esProhibido(e): boolean        // 403
esNoEncontrado(e): boolean     // 404
esValidacion(e): boolean       // 422
esDeRed(e): e is NetworkError
esTimeout(e): e is TimeoutError
esCancelado(e): e is RequestCancelado
esReintentable(e): boolean     // red, timeout, 408, 429, 5xx
mensajeDelServidor(body): string | null   // se muda desde http-client.ts, sin cambios
```

`esReintentable` es el único lugar donde vive la política de reintentos. `query-client.ts` la consume; nadie más la duplica.

### Configuración del cliente — `src/infrastructure/http/create-http-client.ts`

```ts
export interface HttpClientConfig {
    baseUrl?: string
    /** @default 15000 */
    timeoutMs?: number
    /** Headers aplicados a toda petición; los de la llamada tienen prioridad. */
    headers?: HeadersInit
    credentials?: RequestCredentials
    /** Inyectable para tests o para un fetch instrumentado. @default globalThis.fetch */
    fetch?: typeof fetch
}
```

### Contexto de la petición

Es lo que ven los interceptores. `headers` y `meta` son **mutables**: así el interceptor de auth hace `ctx.headers.set(...)` sin devolver nada.

```ts
export interface ContextoPeticion {
    /** URL final, ya con baseUrl y query string. */
    url: string
    method: HttpMethod
    /** Instancia mutable de `Headers`. */
    headers: Headers
    body: BodyInit | undefined
    signal: AbortSignal
    /** Endpoint crudo, tal como lo pasó quien llamó. Útil para logs. */
    endpoint: string
    /** Bolsa libre para que los interceptores se pasen banderas entre sí. */
    meta: Record<string, unknown>
}

type InterceptorPeticion = (ctx: ContextoPeticion) => void | Promise<void>
type InterceptorRespuesta = (respuesta: Response, ctx: ContextoPeticion) => void | Promise<void>
type InterceptorError = (error: ErrorHttpBase, ctx: ContextoPeticion) => void | Promise<void>
```

Los interceptores **observan y mutan el contexto, pero no cortocircuitan**: no pueden devolver una respuesta falsa ni tragarse un error. El error siempre se relanza después de correr los `onError`. Esto mantiene el flujo de control en un solo lugar y evita el agujero clásico de "un interceptor devolvió `undefined` y ahora `T` es `undefined`".

### Superficie pública del cliente

```ts
export interface HttpClient {
    request<T>(endpoint: string, options: HttpRequestOptions): Promise<T>
    get<T>(endpoint: string, options?: QueryRequestOptions): Promise<T>
    post<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T>
    put<T>(...): Promise<T>
    patch<T>(...): Promise<T>
    delete<T>(...): Promise<T>
    interceptores: {
        onPeticion(fn: InterceptorPeticion): () => void
        onRespuesta(fn: InterceptorRespuesta): () => void
        onError(fn: InterceptorError): () => void
    }
}
```

`HttpRequestOptions` es el de hoy más `timeoutMs?: number` y `meta?: Record<string, unknown>`.

### Query params — `src/infrastructure/http/query-params.ts`

```ts
export type ValorParam =
    | string | number | boolean | Date | null | undefined
    | Array<string | number | boolean | Date>

export type QueryParams = Record<string, ValorParam>
```

Reglas de serialización, fijas:

| Valor | Resultado |
| --- | --- |
| `undefined`, `null` | se omite la clave |
| `[]` (array vacío) | se omite la clave |
| `''` | se envía `?clave=` — un filtro vacío es un filtro válido |
| `Date` | `toISOString()` |
| `true` / `false` | `'true'` / `'false'` |
| `[1, 2]` | `?id=1&id=2` (clave repetida, **no** `?id=1,2`) |

Hoy un array cae en `String(value)` y produce `"1,2"`, que ningún backend estándar interpreta como lista.

`unirUrl(baseUrl, endpoint)`: si `endpoint` empieza con `http://` o `https://` se devuelve tal cual, ignorando `baseUrl`. Si no, se unen normalizando la barra intermedia (`http://x:4000/` + `/auth/login` → `http://x:4000/auth/login`).

---

## Plan de implementación

1. **Crear `src/infrastructure/http/http-errors.ts`** con la jerarquía de errores, los helpers de discriminación y `mensajeDelServidor` (copiado literal desde `http-client.ts:16`). Nadie lo importa todavía. Verificación: `npx tsc --noEmit` pasa.

2. **Crear `src/infrastructure/http/query-params.ts`** con `ValorParam`, `QueryParams`, `construirQueryString(params)` y `unirUrl(baseUrl, endpoint)`. Módulo puro, sin dependencias. Verificación: `npx tsc --noEmit` pasa.

3. **Crear `src/infrastructure/http/create-http-client.ts`** con `createHttpClient(config)`. Contiene:
   - Los tres registros de interceptores en `Set`, cada `on*` devuelve la baja.
   - Armado de la URL con `unirUrl` + `construirQueryString`.
   - Serialización del body: JSON salvo `FormData` (idéntico a `http-client.ts:82-94`).
   - Timeout con `AbortController` propio: `setTimeout(() => controlador.abort(RAZON_TIMEOUT), timeoutMs)`, y reenvío del `signal` de quien llama con `addEventListener('abort', …, { once: true })`. `clearTimeout` y baja del listener en `finally`.
   - Traducción del rechazo de `fetch`: si el abort fue por `RAZON_TIMEOUT` → `TimeoutError`; si fue por el signal externo → `RequestCancelado`; en cualquier otro caso → `NetworkError` con la causa original.
   - `parseResponse` movido aquí **sin los efectos de sesión**: solo parsea y lanza `HttpError`. El resto del comportamiento queda igual, `204` incluido.
   - Orden de ejecución: `onPeticion` (secuencial, en orden de registro) → `fetch` → `onRespuesta` → parseo, y `onError` ante cualquier `ErrorHttpBase` antes de relanzarlo.
   Este archivo **no importa nada de `#/presentation`**. Verificación: `npx tsc --noEmit` pasa.

4. **Crear `src/infrastructure/http/interceptores-auth.ts`** con `registrarInterceptoresAuth(cliente)`, idempotente mediante un `WeakSet` de clientes ya cableados. Registra dos interceptores:
   - `onPeticion`: si hay `leerToken()` y el contexto **no** trae ya `Authorization`, lo agrega y marca `ctx.meta.llevabaToken = true`.
   - `onError`: si el error es `HttpError` con status 401 **y** `ctx.meta.llevabaToken === true`, llama `limpiarSesion()` y, con guarda de `typeof window !== 'undefined'`, `window.location.assign('/login')`.
   Es el único archivo de `infrastructure/http/` que importa de `#/presentation`. Verificación: `npx tsc --noEmit` pasa; todavía no lo llama nadie.

5. **Paso de corte — reescribir `src/infrastructure/http/http-client.ts` y activarlo.** Es el único paso grande del plan, y es indivisible: partirlo dejaría la app o sin token o con el token inyectado dos veces. En un solo commit:
   - `http-client.ts` pasa a crear `api = createHttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? '', timeoutMs: 15000 })`, llamar `registrarInterceptoresAuth(api)` y exportar `httpRequest`/`httpGet`/`httpPost`/`httpPut`/`httpPatch`/`httpDelete` como atajos de esa instancia, **con las mismas firmas de hoy**.
   - Re-exporta `HttpError`, `mensajeDelServidor`, `HttpMethod` y `QueryParams` desde su nueva ubicación, para que `useExecuteQuery.ts:2`, `useExecuteMutation.ts:2` y `useLogin.tsx:9` sigan importando de `#/infrastructure/http/http-client` sin tocarse.
   - Se borran de `http-client.ts` el `import` de `almacenamientoSesion`, `tieneAuthorization`, `buildUrl` y la clase `HttpError` (ahora viven en los archivos nuevos).
   - `src/routes/__root.tsx` **no se toca**: el registro vive junto a la creación de la instancia, no en el arranque de las rutas (ver Decisiones).
   Verificación manual: login correcto, login con credenciales malas (mensaje en la card, sin recarga), y navegar por el portal viendo el header `Authorization` en la pestaña Network.

6. **Ajustar `src/infrastructure/query-client/query-client.ts`**: `retry: (intento, error) => intento < 2 && esReintentable(error)` y `retryDelay: (intento) => Math.min(300 * 2 ** intento, 4000)`; agregar `mutations: { retry: 0 }` explícito para dejar escrito que una mutación no se reintenta sola. Verificación: con el backend apagado, una query falla tras tres intentos espaciados; un 404 falla al primero.

7. **Ajustar `src/presentation/hooks/auth/useLogin.tsx`**: `derivarErrorLogin` pasa a discriminar con los helpers — `esDeRed(error) || esTimeout(error)` → `'No se pudo contactar al servidor.'`; `esHttpError(error)` → `mensajeDelServidor(error.body) ?? 'El servidor no está disponible. Intentá de nuevo.'`; cualquier otro error → `'Ocurrió un error inesperado.'`. Verificación: los tres casos del SPEC 02 siguen dando el mismo texto.

8. **Actualizar `CLAUDE.md`**, sección Arquitectura → `infrastructure/`: describir el factory, la instancia `api`, los interceptores, el timeout y dónde vive la política de reintentos.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` pasa sin errores.
- [X] `npx vitest run` pasa completo, con los mismos tests que hoy.
- [X] `useExecuteQuery.ts`, `useExecuteMutation.ts` y `useLogin.tsx` siguen importando desde `#/infrastructure/http/http-client` (los tres imports no cambian de ruta).
- [X] `create-http-client.ts`, `http-errors.ts` y `query-params.ts` no contienen ningún import de `#/presentation` ni de `@tanstack/react-router` (verificable con un grep).
- [X] Login correcto guarda la sesión y entra al dashboard, igual que antes del cambio.
- [X] Login con credenciales incorrectas muestra el mensaje del servidor en la card, **sin** recargar la página ni redirigir.
- [X] Con el backend apagado, el login muestra "No se pudo contactar al servidor." y el error que llega a `onError` es una instancia de `NetworkError`.
- [X] Toda petición posterior al login lleva `Authorization: Bearer <token>` (pestaña Network).
- [X] Un 401 en una petición **con** token limpia `localStorage` y deja al usuario en `/login`.
- [X] Una petición que supera 15 s se corta sola y rechaza con `TimeoutError`, no con un cuelgue indefinido.
- [X] Cancelar una query en vuelo (desmontar el componente) rechaza con `RequestCancelado`, **no** con `TimeoutError` ni con `NetworkError`.
- [X] `httpGet('/x', { params: { ids: [1, 2], desde: new Date(), vacio: undefined } })` produce `?ids=1&ids=2&desde=2026-08-22T…` y omite `vacio`.
- [X] `httpGet('https://otro-host/api/x')` va a `https://otro-host/api/x` y no antepone `VITE_API_URL`.
- [X] Una query contra un endpoint inexistente (404) falla al primer intento, sin reintentos.
- [X] Una query contra el backend apagado se reintenta dos veces antes de llegar al `ErrorBoundary`.
- [X] `createHttpClient({ baseUrl: 'http://x', fetch: fetchFalso })` usa `fetchFalso` y nunca el `fetch` global.
- [X] Registrar un interceptor devuelve una función que, al llamarse, lo da de baja.
- [X] `registrarInterceptoresAuth(api)` llamado dos veces no duplica el header ni el manejo del 401.

---

## Decisiones

- **Sí:** factory `createHttpClient(config)` con una instancia por defecto exportada. Permite un segundo API, un cliente con otro timeout o un `fetch` falso en tests, sin tocar variables globales ni `import.meta.env`.
- **Sí:** los atajos `httpGet`/`httpPost`/... se mantienen con la firma exacta de hoy. Son la superficie que consume todo el proyecto; cambiarla convertiría un refactor de infraestructura en una migración de todos los hooks.
- **No:** clase `HttpClient` con `this`. El closure del factory da lo mismo sin exponer herencia, que en un cliente HTTP es una puerta a jerarquías que nadie quiere mantener.
- **No:** reintentos dentro del cliente HTTP. TanStack Query ya los tiene, con su backoff y su integración con el estado de la query; duplicarlos abajo produciría 2 × 2 = 4 peticiones reales por fallo y un `isFetching` que miente. Lo que sí se sube al cliente es la **clasificación** del error (`esReintentable`), que es la parte que Query no puede saber sola.
- **Sí:** `query-client.ts` cambia `retry: 1` por una función. Hoy un 401 o un 404 se reintentan, lo que retrasa el error medio segundo sin ninguna posibilidad de éxito.
- **Sí:** `mutations: { retry: 0 }` explícito, aunque ya sea el valor por defecto de TanStack Query. Deja escrito que la ausencia de reintentos en un POST es una decisión, no un olvido.
- **Sí:** interceptores registrados desde fuera, en `interceptores-auth.ts`. `create-http-client.ts` queda sin ninguna dependencia de `#/presentation` ni de rutas, que es lo que hace que la pieza sea reutilizable y testeable.
- **Sí:** `http-client.ts` llama a `registrarInterceptoresAuth(api)` junto a la creación de la instancia. **Decisión revertida durante la implementación**: el plan original ponía el registro en un módulo de arranque importado desde `__root.tsx`, para que se viera quién enciende qué. Se descartó porque ese diseño hace que borrar un import de una ruta deje a toda la app mandando peticiones sin token, sin ningún error de compilación que lo delate. La instancia y su cableado nacen juntos: `api` no puede existir a medias. `createHttpClient` sigue siendo puro, así que un cliente contra otro API se instancia sin auth.
- **No:** módulo de arranque importado desde `__root.tsx`. Ver arriba: el registro explícito se paga con un modo de fallo silencioso, y el beneficio (rastrear el encendido) lo da igual de bien tener el registro en la misma línea que la creación.
- **Sí:** `registrarInterceptoresAuth` idempotente con un `WeakSet` de clientes ya cableados, en vez de un booleano de módulo. El HMR de dev puede recargar uno solo de los dos archivos: con un booleano, recargar `http-client.ts` deja al cliente nuevo **sin token** (la bandera vieja sigue en `true`), y recargar `interceptores-auth.ts` duplica el manejo del 401. El `WeakSet` cubre las dos direcciones.
- **No:** interceptores que puedan cortocircuitar (devolver una respuesta o tragarse el error). Habilitarían el refresh token, que está fuera de alcance, y a cambio meterían un camino en el que `request<T>` devuelve algo que nunca vino del servidor.
- **Sí:** `headers` y `meta` mutables en el contexto. Un interceptor que devuelve overrides parciales obliga a definir reglas de merge; mutar un `Headers` es una línea y no tiene ambigüedad.
- **Sí:** `ctx.meta.llevabaToken` como bandera entre el interceptor de petición y el de error. Reproduce exactamente la condición de SPEC 02 que evita que el propio login dispare el cierre de sesión global ante su 401 legítimo.
- **Sí:** `AbortController` propio con `setTimeout`, en vez de `AbortSignal.timeout` + `AbortSignal.any`. Estos dos existen en Chrome 116+ y Node 20+, pero el `abort(razón)` manual es el que permite distinguir un timeout de una cancelación del usuario sin depender de comparar strings de `DOMException`.
- **Sí:** timeout de 15 s por defecto, sobreescribible por petición. Cubre el caso normal y deja salida para un endpoint de reportes que tarde de verdad.
- **Sí:** jerarquía de errores con raíz `ErrorHttpBase`. `useLogin` deja de decidir "no es `HttpError`, entonces el servidor está caído" — hoy un `TypeError` por un bug propio se presenta al operario como un problema de red.
- **Sí:** `HttpError` mantiene `name`, `status` y `body` idénticos. Es el único error que el código existente ya inspecciona.
- **Sí:** `esReintentable` vive junto a los errores, no en `query-client.ts`. Es una propiedad del error, no de la caché.
- **Sí:** arrays de query params como clave repetida (`?id=1&id=2`). Es lo que interpretan Express, NestJS y prácticamente cualquier backend; `?id=1,2` obliga a un `split` a mano del otro lado.
- **Sí:** `''` se envía como `?clave=` en vez de omitirse. Un filtro de texto vacío es un valor legítimo y distinto de "no filtrar"; omitirlo silenciosamente escondería un bug de filtros.
- **Sí:** las URLs absolutas ignoran `baseUrl`. Cuesta tres líneas y evita tener que instanciar un cliente entero para pegarle a un endpoint suelto de otro host.
- **No:** tests de vitest del cliente en este spec. Decisión explícita del usuario para mantener el spec chico. Queda anotado como riesgo: la reescritura de la capa de datos se verifica a mano.
- **No:** arreglar el `204 No Content` que hoy devuelve `''` casteado a `T`. Decisión explícita del usuario. `parseResponse` se muda de archivo con el comportamiento intacto; el bug latente sigue ahí y queda anotado en Riesgos.
- **No:** validación de la respuesta con zod. Se resolvería mejor en la capa de hooks de dominio, donde el tipo se conoce, y no en un cliente genérico.
- **No:** refresh token con cola de peticiones. El backend no expone `/auth/refresh`; el diseño de interceptores no lo bloquea, pero implementarlo hoy sería contra un endpoint imaginario.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| ~~Alguien borra el import de `interceptores-auth` en `__root.tsx` y el 401 deja de cerrar sesión, en silencio y sin error de compilación.~~ | **Eliminado durante la implementación.** El registro se movió junto a la creación de la instancia en `http-client.ts` (ver Decisiones), así que no hay ningún import que borrar. |
| Reescritura completa de la capa de datos **sin un solo test automático** (decisión del usuario). Una regresión en el armado de la URL, del body o de los headers solo se descubre usando la app. | El paso 5 es un corte único y verificable a mano en cinco minutos (login OK, login KO, Network con el header). Cuando aparezca el primer bug, escribir la suite deja de ser opcional. |
| El `204 No Content` sigue devolviendo `''` casteado a `T` (decisión del usuario). Un `DELETE` que responda 204 entrega `''` donde el tipo promete un objeto. | Queda documentado aquí. Ningún endpoint actual devuelve 204; el riesgo se materializa al conectar los hooks de dominio. |
| Los interceptores son `async` y corren en serie: uno lento retrasa **todas** las peticiones. | Los dos de este spec (`leerToken`, `limpiarSesion`) son síncronos y leen `localStorage`. La firma admite promesas por extensibilidad, pero nada las usa hoy. |
| El listener de `abort` sobre el `signal` de quien llama queda colgado si la petición termina bien, y con muchas peticiones sobre un mismo signal se acumula. | Se registra con `{ once: true }` y se da de baja en el `finally` junto al `clearTimeout`. |
| `interceptores-auth.ts` se ejecuta también en SSR, donde no hay `window` ni `localStorage`. | `leerToken()` y `limpiarSesion()` ya tienen guarda de `typeof window` (SPEC 02); el `window.location.assign` lleva la suya propia. |
| El timeout de 15 s corta un endpoint legítimamente lento y el operario ve un error donde había una espera. | `timeoutMs` es sobreescribible por petición. Al conectar un endpoint pesado, se sube ahí y no en la config global. |
| `VITE_API_URL` con barra final producía `//auth/login` antes de este spec. | `unirUrl` normaliza la barra intermedia. El otro error clásico —`VITE_API_URL` **sin** esquema— sigue siendo posible y está documentado en el SPEC 02. |
| Cinco archivos donde antes había uno: alguien importa `createHttpClient` directamente y crea una segunda instancia sin interceptores de auth, cuyas peticiones van sin token. | La instancia buena es `api` en `http-client.ts` y los atajos siguen siendo la vía normal. `CLAUDE.md` (paso 8) deja escrito que el factory se usa solo para clientes contra otros APIs. |

---

## Lo que **no** entra en este spec

- Tests de vitest del cliente HTTP.
- Arreglar el parseo del `204 No Content` ni el JSON inválido que hoy cae a `null`.
- Reintentos dentro del cliente HTTP.
- Refresh token, cola de peticiones en vuelo y renovación silenciosa.
- Validación de respuestas con zod.
- Deduplicación de peticiones, caché propia o telemetría.
- Subida con progreso, descarga de blobs, `responseType`.
- Crear un segundo cliente contra otro API.
- Cablear `useControlCalidad` y `useParametros` al backend real.

Cada uno de ellos, si se hace, va en su propio spec.
