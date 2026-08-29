# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev              # Vite dev server en http://localhost:3000
npm run build            # Build de producción (TanStack Start)
npm run preview          # Sirve el build
npm run test             # vitest run (todos los tests)
npm run generate-routes  # tsr generate — regenera src/routeTree.gen.ts

npx vitest run src/presentation/hooks/bascula/useSerialScale.test.tsx   # un solo archivo
npx vitest run -t "nombre del caso"                                     # un solo caso
npx tsc --noEmit                                                        # typecheck (no hay script)
```

No hay linter ni formatter configurado en el proyecto.

`routeTree.gen.ts` lo genera el plugin de router en cada `dev`/`build`; está marcado como readonly en `.vscode/settings.json` — no editarlo a mano.

## Stack

TanStack Start (SSR) + TanStack Router (file-based) + TanStack Query + React 19 + Tailwind v4 + shadcn (estilo `base-nova`, sobre `@base-ui/react`) + react-hook-form/zod. Los comentarios y el texto de la UI están en español; mantener ese idioma. Los identificadores nuevos —nombres de componentes, funciones y props— van en **inglés** (`EmptyState`, no `EstadoVacio`). El código existente sigue en español (`ClienteCard`, `useClientes`, `SideBar`…) y no se renombra: la regla aplica sólo de acá en adelante.

## Arquitectura

Capas bajo `src/`, con alias `#/*` y `@/*` apuntando ambos a `src/` (`#/` es el estándar del código propio; `@/` lo usan los componentes generados por shadcn):

- `infrastructure/` — `http/` (el cliente HTTP, ver más abajo) y `query-client/query-client.ts` (instancia única de `QueryClient`, donde vive la política de reintentos).
- `presentation/hooks/` — hooks genéricos en `shared/`, hooks de dominio por módulo (`bascula/`, `parametros/`). Los hooks de dominio concentran el estado y la lógica; las rutas y las vistas solo pintan.
- `presentation/views/<módulo>/` — cards/tablas grandes de una pantalla. `presentation/components/` — piezas reutilizables (`shared/`) o específicas de un módulo.
- `presentation/types/<módulo>/` — tipos de dominio.
- `components/ui/` — primitivas shadcn; no reescribirlas a mano, agregar con el CLI de shadcn.
- `routes/` — solo composición: `createFileRoute` + hook de dominio + views.

### Datos: siempre por los hooks genéricos

`useExecuteQuery(queryKey, endpoint, options)` usa `useSuspenseQuery` — nunca hay `isLoading`/`isError` manual. Todo componente que lo llame debe estar envuelto en `<Suspense>` y en el `ErrorBoundary` de `#/presentation/components/shared/ErrorBoundary` (recibe `fallback: (error, reset) => ReactNode`). `useExecuteMutation(endpoint, { method })` cubre el resto; `endpoint` puede ser una función de las variables para URLs con id.

Varios hooks de dominio (`useControlCalidad`, `useParametros`) todavía devuelven datos mock en `useState`; al conectarlos al backend, reemplazar solo el interior del hook.

Las notificaciones van por `sonner` (`toast.success` / `toast.error`), con el `<Toaster />` montado en `__root.tsx` dentro del `ThemeProvider`. Una mutación reporta su resultado por el toast, no por el `ErrorBoundary`, y el texto del error se deriva con los helpers de `http-errors.ts` (ver `derivarErrorPesaje` en `usePesajes`).

### Cliente HTTP

`infrastructure/http/` está dividido por responsabilidad, y la división **es** la frontera: `core/` y `transportes/` no importan **nada** de `#/presentation` ni del router; `interceptores/` es lo único que conoce la sesión y `/login`. Al tocar la carpeta, mantener eso.

**`core/`** — el núcleo puro.

- `http-errors.ts` — jerarquía con raíz `ErrorHttpBase`: `HttpError` (`status`, `body`), `NetworkError`, `TimeoutError`, `RequestCancelado`. Más los helpers `esHttpError`/`esDeRed`/`esTimeout`/`esNoAutorizado`/... Discriminar siempre con ellos, nunca por descarte. `esReintentable` es la **única** definición de qué se reintenta (red, timeout, 408, 429, 5xx) y la consume `query-client.ts`. `mensajeDelServidor(body)` cubre las dos formas del backend: el `message` string, y el objeto con el array de errores de Zod, que aplana a una línea por campo (`• lote_id: Required`).
- `query-params.ts` — armado de la URL. Arrays como clave repetida (`ids=1&ids=2`), `Date` a ISO, `undefined`/`null` omitidos, `''` sí se manda. Un endpoint absoluto (`https://...`) ignora la base.
- `config-http.ts` — `BASE_URL` y `TIMEOUT_POR_DEFECTO_MS`. El **único** lugar donde se lee `import.meta.env`.
- `create-http-client.ts` — `createHttpClient(config)`: `baseUrl`, `timeoutMs` (sobreescribible por petición y combinado con el `signal` de quien llama), `fetch` inyectable, e interceptores `onPeticion`/`onRespuesta`/`onError` que observan y mutan el contexto pero **nunca** cortocircuitan. No reintenta ni sabe del 401: de los reintentos por error se encarga TanStack Query, y del 401 la fachada. La opción `parsear: 'json' | 'blob'` elige el transporte.

**`transportes/`** — cómo se lee el cuerpo, sin conocer nada más.

- `respuesta-json.ts` — el camino por defecto.
- `respuesta-blob.ts` — binario. Lanza `HttpError` fuera de 2xx **y también** ante un 2xx que responde `application/json`: es el backend contestando un error sin cambiar el status, y sin esa rama se descarga un "PDF" que es un mensaje de error.
- `cuerpo-multipart.ts` — `aFormData(objeto)`. `File`/`Blob` tal cual, otro objeto como JSON, el resto `String(valor)`, `undefined`/`null` omiten la clave. El `Content-Type` no se fija en ningún lado: el cliente lo omite ante un `FormData` para que el navegador ponga el `boundary`.

**`interceptores/`** — lo único que toca la sesión.

- `interceptores-auth.ts` — inyecta el `Bearer` y nada más. Exporta `peticionLlevaToken(headers)` (la regla que decide si un 401 es de la sesión o del propio login) y `cerrarSesionYSalir()`. La política del 401 **no** vive acá: un `onError` que llamara a `limpiarSesion()` borraría el refresh token justo antes de que el reintento alcanzara a usarlo.
- `refresh-token.ts` — `refrescarSesion()` contra `POST /auth/refresh`, **single-flight**: dos 401 simultáneos comparten la promesa y el backend ve un solo refresh. Sale por un cliente propio sin interceptores de auth, porque si saliera por `api` su propio 401 dispararía otro refresh. El endpoint todavía no existe en el backend: hasta que exista, el refresh falla y se degrada al cierre de sesión.

**`http-client.ts`** — la fachada. `httpRequest` envuelve a `api.request` y es donde vive la política del 401: refrescar → reintentar **una sola vez** → si el refresh falla o no hay refresh token, cerrar sesión e ir a `/login`. Los atajos `httpGet`/`httpPost`/... se construyen sobre `httpRequest`, así que llevan refresh; **`api` no**, y está exportado sólo para casos que necesiten el 401 crudo. Usar los atajos. `createHttpClient` es para un cliente contra **otro** API, y ese nace sin auth ni refresh.

Los hooks de `presentation/hooks/shared/` cubren los cuatro casos: `useExecuteQuery`, `useExecuteMutation`, `useExecuteFilesMutation` (multipart) y `useExecutePdfMutation` (binario, que revoca sus object URLs al regenerar y al desmontar).

Dos comportamientos heredados y asumidos: un `204 No Content` devuelve `''` casteado a `T`, y los GET mandan `Content-Type: application/json`. Del cliente sólo hay tests del refresh y del reintento del 401 (`interceptores/refresh-token.test.ts`); `create-http-client`, `query-params` y los transportes siguen sin cubrir (SPEC 03, SPEC 06).

### Permisos

`src/presentation/types/auth/permissions.ts` es la **única** fuente de los strings de permiso: `PERMISSIONS` (objeto plano `as const`) y el tipo `Permission` derivado de sus valores. Nunca escribir `'clientes.listar'` a mano en una pantalla; un permiso nuevo se agrega primero al catálogo, con el string verificado contra el backend.

Para consultarlos, `usePermissions()` (`has` / `hasAny` / `hasAll`, tipados contra `Permission`) o el componente `<Can permission={...}>`. Un `<Can>` sin ninguna de sus tres props (`permission`, `anyOf`, `allOf`) renderiza sus hijos: un olvido de prop no esconde contenido en silencio.

Dos reglas del flujo, fijadas en SPEC 07:

- Los permisos se piden **una sola vez, en el login** — `GET /permisos/me` encadenado al `onSuccess` de `useLogin`, después de `iniciarSesion` (el `Bearer` sale de `localStorage`, que recién ahí tiene el token) y antes de navegar. No se revalidan al recargar ni al cambiar de ruta: viven en `localStorage` bajo `auth_permisos` y se leen desde `Sesion.permisos`.
- Un fallo de `/permisos/me` **no** bloquea la entrada: se entra con `permisos: []`. Lo mismo vale para una sesión guardada antes de SPEC 07, sin esa clave.

La sesión guarda `string[]`, no `Permission[]`: un permiso que el backend emite y el catálogo no conoce se persiste igual (en desarrollo, `advertirPermisosDesconocidos` lo avisa por consola). Se guarda ancho y se consulta estrecho.

Ocultar UI por permisos es comodidad, no control de acceso: `localStorage` es editable desde la consola del navegador y quien tiene que rechazar la operación es el backend, endpoint por endpoint. Hoy **ninguna** pantalla los aplica todavía —ni el Sidebar, ni los guards de ruta, ni un botón—; SPEC 07 entrega sólo la herramienta.

### Rutas

Grupos `(auth)` y `(portal)` con layouts pathless: `(portal)/_portal.tsx` monta el `Sidebar` + `<Outlet/>` y hace el guard en `beforeLoad` (hoy `const isLogged = true` — placeholder). Las rutas hijas son archivos planos con punto: `_portal.control-calidad.tsx` → `/control-calidad`. Las URLs no incluyen el grupo ni el layout.

`__root.tsx` es el `shellComponent`: html/body, `QueryClientProvider`, `ThemeProvider` y devtools sólo en dev.

### Báscula (Web Serial)

`presentation/hooks/bascula/useSerialScale.tsx` es el núcleo del producto: abre el puerto con la Web Serial API, parsea las tramas del indicador, corre la ventana de estabilización (un solo ticker gobierna cuenta regresiva y confirmación), un watchdog de "sin señal" con el puerto abierto, y reconexión automática con backoff exponencial. La configuración viva y los callbacks se leen por `configRef`/`callbacksRef` para evitar closures obsoletos en el bucle de lectura; los timers y refs se limpian en el desmontaje. Al tocar este hook, cuidar el orden de cierre: cancelar el reader → esperar `bucleRef` → `port.close()`, o `close()` falla con "port is already locked".

Los tipos de la Web Serial API están declarados a mano en `src/global.d.ts` (no hay `@types/w3c-web-serial`). Sólo funciona en Chrome/Edge de escritorio; `estado === 'no-soportada'` cubre el resto.

`useControlCalidad` envuelve a `useSerialScale` y añade las reglas de negocio (rango min/ideal/max, bloqueo crítico con PIN de supervisor).

## Estilos

Tailwind v4 sin `tailwind.config.js`: los tokens viven en `src/styles.css` bajo `@theme`, con variables CSS redefinidas en `:root/.light` y `.dark`. Usar los tokens semánticos (`bg-surface`, `text-text-main`, `text-text-muted`, `border-border-ui`, `bg-bg-app`, `shadow-clay-card`, `shadow-clay-btn`) en vez de colores crudos cuando exista el token. El modo oscuro es por clase en `<html>` (`ThemeProvider`, persistido en `localStorage` bajo `bascula-ui-theme`) y se declara con `@variant dark (.dark &)`.

## Tests

Vitest sin archivo de configuración propio: los tests que necesiten DOM deben empezar con el docblock `// @vitest-environment jsdom`. El test de `useSerialScale` monta un `PuertoFalso` que simula el `SerialPort` (inyecta tramas, fuerza pérdida del dispositivo) — es la referencia para probar cualquier cambio en el hook.

## Formularios

react-hook-form + zod (`@hookform/resolvers`) a través de los wrappers `Controlled*` en `presentation/components/shared/inputs/` (`ControlledInput`, `ControlledSelector`, `ControlledDatePicker`), que reciben `control` y `name` tipados y ya pintan label y error.
