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

Las notificaciones van por `sonner` (`toast.success` / `toast.error`), con el `<Toaster />` montado en `__root.tsx` dentro del `ThemeProvider`. Una mutación reporta su resultado por el toast, no por el `ErrorBoundary`.

El **toast de éxito lo escribe cada hook**; el **de error sale solo**. Los `useExecute*Mutation` traen el `onError` puesto (`shared/errorToast.ts`), porque en planta un guardado que falló y no avisó nada se descubre al cerrar el turno. No hay nada que configurar: la regla es la ausencia del callback.

- Un hook **sin `onError`** recibe el toast, con el texto que ya trae el error (ver `HttpError` más abajo). No hay que escribir un `onError` para avisar de un fallo, ni llamar a `mensajeDeError`: `useCrearCliente` y `usePesajes` sólo declaran su `onSuccess`.
- Un hook **con `onError`** está diciendo que del error se encarga él, y el toast no sale. Es el caso de `useLogin`, que lo pinta dentro del formulario en vez de flotando.

Una `RequestCancelado` no toastea: cancelar al desmontar la pantalla no es un fallo que el operario tenga que ver.

### Cliente HTTP

`infrastructure/http/` está dividido por responsabilidad, y la división **es** la frontera: `core/` y `transportes/` no importan **nada** de `#/presentation` ni del router; `interceptores/` es lo único que conoce la sesión y `/login`. Al tocar la carpeta, mantener eso.

**`core/`** — el núcleo puro.

- `http-errors.ts` — jerarquía con raíz `ErrorHttpBase`: `HttpError` (`status`, `body`), `NetworkError`, `TimeoutError`, `RequestCancelado`. Más los helpers `esHttpError`/`esDeRed`/`esTimeout`/`esNoAutorizado`/... Discriminar siempre con ellos, nunca por descarte. `esReintentable` es la **única** definición de qué se reintenta (red, timeout, 408, 429, 5xx) y la consume `query-client.ts`. `mensajeDelServidor(body)` cubre las dos formas del backend: el `message` string, y el objeto con el array de errores de Zod, que aplana a una línea por campo (`• lote_id: Required`).

  Todo error del cliente nace con un `message` **ya presentable**, y es lo que hace innecesario derivarlo en la capa de presentación. `HttpError` lo resuelve en su constructor: el `message` del backend → el texto por status de `MENSAJES_POR_STATUS` (o el genérico de 5xx) → recién ahí el `"400 Bad Request"` técnico, que además queda siempre en `mensajeTecnico` para los logs. Los otros tres ya lo traen de `traducirFallo`. Por eso `mensajeDeError(error, respaldo)` es un `instanceof ErrorHttpBase` y nada más —su trabajo es no filtrar el mensaje de un error ajeno, un `TypeError` del propio front, a la pantalla del operario—; si hay que mejorar un texto, se mejora acá y lo ve toda la app. En una mutación no hay que llamarlo: lo llama el toast automático (ver arriba).
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

Ocultar UI por permisos es comodidad, no control de acceso: `localStorage` es editable desde la consola del navegador y quien tiene que rechazar la operación es el backend, endpoint por endpoint.

Dónde se aplican hoy:

- **Navegación.** El `Sidebar` esconde cada item de `menuItems` (y cada hijo) cuyo `permission` no está en la sesión, y los items de Agri y del Mirador van envueltos en un `<Can>` (`USARCHATIA` y `VERMIRADOR3D`). La portada (`HomeView`) repite **los mismos destinos con los mismos permisos** en sus accesos rápidos y en las tarjetas de Agri y del Mirador: la portada no abre puertas que la barra lateral no muestra. Al agregar o mover un módulo, tocar los dos. La excepción es Métricas (`VER-METRICAS`), que está en el `Sidebar` y a propósito no en la portada (SPEC 15).
- **Acciones.** Los botones de crear, aprobar y rechazar, y los menús de fila (`ClientRowActions`, `PesajeRowActions`, `DocumentoFiscalRowActions`), van detrás de un `<Can>`.
- **Rutas, no.** No hay guard de permisos en ninguna ruta: quien escribe la URL a mano entra a la pantalla, y lo frena el backend.

### Contraseña vencida (SPEC 14)

El backend vence las contraseñas (SPEC 33 de allá), y todo usuario creado con `POST /auth/register` **nace vencido**: sin este flujo, ningún usuario nuevo entra. `POST /auth/login` con la contraseña correcta y vencida responde **403** con `passwordVencida: true` en el cuerpo, sin token.

- **Se distingue por el cuerpo, no solo por el status.** `isExpiredPasswordError` (`hooks/auth/passwordVencida.ts`) pide `esProhibido` **y** `body.passwordVencida === true`; un 403 por otro motivo sigue al banner del login. Vive en `presentation/` y no en `http-errors.ts`, porque `core/` no conoce el dominio.
- **El 403 solo llega con la contraseña correcta.** Por eso el `ExpiredPasswordDialog` (`components/auth/`) no vuelve a pedir usuario ni contraseña actual: `useLogin.onError` guarda las del intento —sacadas de `variables`, no del formulario— en `expiredCredentials`, y el diálogo se monta mientras eso no es `null`.
- **Las credenciales viven solo en memoria**, en ese `useState`. Nunca en `localStorage` ni en la sesión. Se borran al cerrar el diálogo y al renovar.
- **`POST /auth/renovar-password`** es público y no devuelve token, y **renovar no inicia sesión**. `useRenewPassword` pinta el `toast.success` y `handlePasswordRenewed` cierra el diálogo y vacía el campo de contraseña del login (con `resetField`; el usuario queda escrito): el usuario ingresa a mano con la nueva, por el login de siempre. Sin vaciarlo, la vieja sigue escrita y el próximo intento es un 401.
- **`useLogin` y `useRenewPassword` traen `onError` propio**, así que ninguno de los dos toastea un error: el login pinta en su banner y la renovación dentro del diálogo, que sigue abierto.
- `createRenewPasswordSchema(currentPassword)` es una factory porque "distinta de la actual" se valida en el front. Sus mensajes (`RENEW_PASSWORD_MESSAGES`) son a la vez el checklist del diálogo, y repiten las reglas de `RenovarPasswordDto` del backend: si cambian allá, se tocan acá.
- El diálogo se puede cerrar (Cancelar, X, Esc) salvo con la renovación en curso. No es bloqueante como el `PrintTicketDialog`: sin token no hay acceso, así que trabarlo no protege nada.

### Rutas

Grupos `(auth)` y `(portal)` con layouts pathless: `(portal)/_portal.tsx` monta el `Sidebar` + `<Outlet/>` y hace el guard de sesión: `beforeLoad` redirige a `/login` si no hay token en `localStorage` (la ruta es `ssr: false`), y un efecto sobre `estaAutenticado` cubre el cierre de sesión con la pantalla ya abierta. El guard mira sólo la sesión, no los permisos (ver Permisos). La portada es `_portal.index.tsx` → `/`, que monta `HomeView`. Las rutas hijas son archivos planos con punto: `_portal.control-calidad.tsx` → `/control-calidad`. Las URLs no incluyen el grupo ni el layout.

`__root.tsx` es el `shellComponent`: html/body, `QueryClientProvider`, `ThemeProvider` y devtools sólo en dev.

### Báscula (Web Serial)

`presentation/hooks/bascula/useSerialScale.tsx` es el núcleo del producto: abre el puerto con la Web Serial API, parsea las tramas del indicador, corre la ventana de estabilización (un solo ticker gobierna cuenta regresiva y confirmación), un watchdog de "sin señal" con el puerto abierto, y reconexión automática con backoff exponencial. La configuración viva y los callbacks se leen por `configRef`/`callbacksRef` para evitar closures obsoletos en el bucle de lectura; los timers y refs se limpian en el desmontaje. Al tocar este hook, cuidar el orden de cierre: cancelar el reader → esperar `bucleRef` → `port.close()`, o `close()` falla con "port is already locked".

Los tipos de la Web Serial API están declarados a mano en `src/global.d.ts` (no hay `@types/w3c-web-serial`). Sólo funciona en Chrome/Edge de escritorio; `estado === 'no-soportada'` cubre el resto.

`useControlCalidad` envuelve a `useSerialScale` y añade las reglas de negocio (rango min/ideal/max, bloqueo crítico con PIN de supervisor).

### El ticket cierra el pesaje

Todo `POST /pesajes` exitoso abre el `PrintTicketDialog` (`components/control-calidad/`), y la impresión del ticket **no es opcional**: un bulto sin etiqueta después no se identifica en planta. El modal es bloqueante de verdad —`showCloseButton={false}`, `onOpenChange` vacío y el `open` controlado por `impresion.pesaje`— así que no se cierra con la X, ni con Esc, ni con un click afuera. Su única acción es "Imprimir ticket", que llama a `usePrintEtiqueta` con el `id` que devolvió el guardado.

**Imprimir es el diálogo del navegador, no la descarga.** `printUrl` (hermano de `downloadUrl` en `helpers/file/`) monta el PDF en un iframe oculto y llama a `print()` en su ventana: el operario elige la impresora y el archivo no toca la carpeta de Descargas. Saber que el diálogo se cerró es la parte difícil: **con un PDF el `afterprint` no llega**, porque se queda en el visor interno del navegador y no sube ni a la ventana del iframe ni a la de la página. Por eso la promesa resuelve con lo primero que ocurra entre ese `afterprint` —escuchado igual en las dos ventanas— y **el foco volviendo a la página**, ignorando los primeros 700 ms, que son el rebote de abrir el diálogo. Sin ese fallback el modal se queda colgado en "Abriendo impresión…" para siempre. Recién al resolver se saca el iframe del DOM; quitarlo antes cancela la impresión. Resolver significa que **el diálogo se abrió y se cerró**, no que el papel salió —se cierra igual si el operario cancela—, y por eso no hay toast de éxito. La descarga sigue existiendo, pero sólo para el historial (`useDownloadEtiqueta` + `PesajeRowActions`); el endpoint del reporte y los tipos que comparten los dos hooks viven en `hooks/pesajes/etiquetaPesaje.ts`.

Dos reglas que van juntas:

- **La salida de emergencia aparece recién con dos fallos** (`FALLOS_PARA_OMITIR` en `useControlCalidad`). Si el servicio de reportes se cae, un modal sin salida frena la planta con el producto sobre la plataforma; exigir un reintento antes evita que un timeout suelto enseñe el atajo. El contador se reinicia con cada pesaje: que la etiqueta anterior fallara dos veces no habilita el atajo en el bulto siguiente.
- **`mostrarBloqueo` exige `pesajeRegistrado === null`.** Con el modal abierto la báscula sigue leyendo, y un producto que no se retiró reestabiliza en 5 s: sin esa guarda el `BloqueoCriticoDialog` aparecería encima del ticket, sobre un pesaje que ya está guardado.

Por eso `guardarPesaje` devuelve el `PesajeCreado` y no un `boolean`, y tanto `imprimirEtiqueta` como `descargarEtiqueta` piden un `{ id: number }` —no un `PesajeData`— y devuelven `boolean`: el modal necesita saber si contar un fallo, y el toast rojo del error ya lo pone `useExecutePdfMutation`. La reimpresión sigue saliendo del historial (`PesajeRowActions`); `/control-calidad` no reimprime.

### Agri (chat IA)

`/agri` es la pantalla de chat con IA: `routes/(portal)/_portal.agri.tsx` monta `views/agri/AgriChatView.tsx`, que cablea el hook con los cinco componentes de `components/agri/` (avatar, burbuja, indicador de tipeo, compositor y bienvenida). El item del Sidebar vive arriba de la etiqueta "Operación", fuera del `menuItems.map`, envuelto en `<Can permission={PERMISSIONS.USARCHATIA}>` (`'USAR-CHAT-IA'`); la tarjeta de Agri en la portada pide el mismo permiso.

**El hilo sale de `POST /chat`.** `presentation/hooks/agri/useAgriChat.tsx` manda cada turno por `useExecuteMutation`; `isThinking` es el `isPending` de esa mutación y el hilo sigue viviendo en un `useState`. El backend **no guarda la conversación**: el contexto lo pone el front en cada envío, con `{ mensaje, conversacion, historial }`.

Tres reglas del cuerpo, que es donde da 400:

- `mensaje` — trimmeado, no vacío, **máximo 500 caracteres**. El hook corta el largo antes de mandar con un `toast.error`: el 400 ya habría gastado un turno del límite diario del usuario.
- `conversacion` — **UUID o nada**. Se genera una vez por hilo y se reenvía igual en todos sus turnos; "Nueva conversación" genera otro. Un id incremental, un `Date.now()`, un `''` o un `null` son 400, así que cuando no hay UUID que mandar (`crypto.randomUUID` pide contexto seguro; el respaldo sale de `getRandomValues`) la clave **se omite**. Sólo agrupa los turnos en el log del backend.
- `historial` — array de `{ rol: 'usuario' | 'asistente', contenido }`, nunca `'user'`/`'assistant'`/`'system'`. `aHistorial` traduce los roles, recorta el `contenido` a 4000 caracteres y manda los últimos diez turnos, que es lo único que el backend le reenvía al modelo. Sólo turnos visibles: ni resultados de herramientas ni mensajes de sistema.

El endpoint contesta **200 casi siempre**: si el modelo falla o el usuario agotó su límite diario, la explicación viene escrita en `respuesta` y se pinta como un mensaje más de Agri. Un error de verdad (400, 401, red) sale por el toast automático de la mutación, y no se reintenta solo — cada turno cuenta contra el límite diario.

El `onSuccess` que empuja la respuesta al hilo es el de la llamada (`mutate(cuerpo, { onSuccess })`), no el de las opciones del hook: `reset()` lo desengancha, y es lo que hace que "Nueva conversación" en medio de un turno no vea aparecer esa respuesta dentro del hilo nuevo.

El chat es de **sólo lectura** —el backend elige entre funciones de consulta— y **no filtra por cartera**: cualquier usuario autenticado puede preguntar por lotes de cualquier cliente. No montar botones de acción (aprobar, finalizar) sobre una respuesta.

**Las sugerencias sí salen del backend.** `useAgriSugerencias` pide `GET /chat/sugerencias`, que devuelve siempre tres frases en **texto plano** (nunca markdown: se pintan tal cual, sin `MarkdownContent`) armadas con la cartera del usuario que sale del token. El endpoint no llama a Gemini y no cuenta contra el límite diario, así que abrir el chat es gratis y la query se pide al montar la pantalla vacía. Va con `staleTime: Infinity`: la cartera no cambia en medio de una sesión, y sin eso "Nueva conversación" vuelve a suspender la bienvenida a los cinco segundos.

El `<Suspense>` y el `ErrorBoundary` de esa query viven **dentro de `AgriWelcome`**, no en la ruta: suspender la pantalla entera cambiaría el chat por un spinner cuando el saludo y el compositor ya podrían estar puestos. Si la query falla, el fallback es una línea chica más "Reintentar" y el compositor sigue funcionando — las sugerencias son comodidad, no la pantalla.

Tres cosas que el chat **no** hace, y que no conviene agregar de prepo porque cada una es un spec (SPEC 10 las deja anotadas):

- **No hay streaming.** La respuesta llega entera. El `createHttpClient` elige entre `parsear: 'json' | 'blob'` y leer un `ReadableStream` es un transporte nuevo en la capa HTTP. La sensación de escritura progresiva la da `MarkdownContent animated`, que ya existía.
- **No hay persistencia.** Recargar vacía el hilo. Ni `localStorage` ni backend de conversaciones, así que tampoco hay lista de chats.
- **No hay contexto de dominio.** El front manda texto y nada más: ningún id de lote ni de cliente viaja con el mensaje.

`--agri-from` y `--agri-to` (en `styles.css`, expuestos como `agri-from`/`agri-to`) son el acento de **esta** pantalla: el avatar, el botón de enviar, el halo del compositor y el item del Sidebar. No son tokens de la app — el resto de `/agri` se pinta con `bg-surface`, `text-text-main` y compañía como cualquier otra pantalla. La clase `.agri-dot` anima los tres puntos del indicador, con el `animation-delay` por punto escrito en el `style` desde el componente, igual que hace `MarkdownContent` con `.md-word`.

`MarkdownContent` monta `remark-gfm`, que es lo que hace que las tablas se pinten como `<table>`. Sin él, `react-markdown` es CommonMark pelado y un `| Lote | Peso |` sale como un párrafo con los pipes a la vista — tanto en el chat como en el resumen IA de lotes.

### Mirador (planta en vivo, SPEC 13)

`/mirador` es el tablero 3D de la planta: `routes/(portal)/_portal.mirador.tsx` → `usePlantTwin` → `views/mirador/PlantTwinView.tsx`, con la escena en `components/mirador/scene/PlantScene.ts` (Three.js, fuera de React, con su propio `requestAnimationFrame`). El contrato fuente es el SPEC 32 del backend.

El item del `Sidebar` (arriba de "Operación", junto al de Agri) va envuelto en `<Can permission={PERMISSIONS.VERMIRADOR3D}>` (`'VER-MIRADOR-3D'`), y la `MiradorCard` de la portada pide el mismo permiso.

**La foto es la verdad; el diff lo hace el front.** `GET /plantas/en-vivo` (sin params ni body; no filtra por cartera) devuelve la planta entera: KPIs del día y los clientes con sus lotes. No manda eventos: `diffPlantSnapshot` compara cada foto con la anterior y la escena anima eso y nada más. El diff depende de dos garantías del backend: los ids de pesaje son correlativos y nunca se reutilizan (`ultimos_pesajes` son los 10 de mayor `id`, en orden `id` DESC), y `bultos` cuenta **todos** los pesajes activos del lote, así que una anulación se detecta porque `bultos` baja más de lo que explican los pesajes nuevos.

Las casillas son `'en-pesaje' | 'por-aprobar' | 'finalizado'`, con el mismo string que manda el backend; `'rechazado'` no tiene casilla y sólo viaja para animar la salida. **No hay casilla de despacho ni `documento_fiscal`**: volver a tenerlos exige un spec en el backend primero. `pct_en_rango_hoy` es `null` sin pesajes en el día y se pinta "—"; `lote.producto`, `lote.unidad_medida`, `pesaje.usuario` y `estado_calidad_codigo` (`IDEAL`/`MAXIMO`/`MINIMO`) pueden venir en `null`. Un lote con `etapa_id` en `NULL` en la base no sale en la foto: es una regla del backend, no un bug.

**El intervalo es un acuerdo con el backend, no una preferencia.** `INTERVALO_POLLING_MS` (75 s) más un desfase de hasta `DESFASE_POLLING_MS` (30 s), sólo con la pestaña visible y un pedido inmediato al volver a ella.

- **Nunca más de 2 min.** Un lote rechazado viaja sólo 5 min desde `rechazado_en`; con más intervalo una pantalla puede no verlo nunca. Subirlo exige agrandar esa ventana en `plantas.repository.ts` del backend.
- **Nunca bajarlo sin hablarlo allá.** El backend no tiene caché: a 10 s, 50 pantallas son 5 req/s de cinco consultas cada una.
- **El desfase sale de la hora del último pedido, no de `Math.random()`.** React Query recalcula `refetchInterval` en cada render y reinicia el timer si el valor cambió: un valor aleatorio posterga el pedido cada vez que alguien toca la escena.

El indicador "en vivo" (`FOTO_VIEJA_MS`, 4 min) mira el `dataUpdatedAt` de la query, no `generado_en` (el reloj de MySQL y el del navegador no están sincronizados) ni el de la última foto distinta (una planta quieta devuelve la misma foto y eso también dice que responde). Un refetch que falla no dispara el `ErrorBoundary`, porque ya hay datos: la escena se queda con la última foto y el indicador avisa.

**Los pesajes vuelan repartidos en el intervalo.** Con `n` pesajes nuevos en una foto (como mucho `MAX_VUELOS`, 6), el espacio entre vuelos es `clamp(intervalo × 0,8 / n, 1,15 s, 12 s)`. Lo que quedó en cola al llegar la foto siguiente aterriza sin vuelo: la escena nunca se atrasa respecto del dato.

**El detalle del lote sale de `GET /pesajes/byLote/:loteId`** (`useLotWeighings`, sobre `useGetInspeccionPesajes`), ordenado por `created_at` DESC, no por `id`. Lo pide `LotWeighingsLoader`, que se monta sólo con un lote seleccionado y tiene su propio `<Suspense>` y `ErrorBoundary`: suspender la vista desmontaría la escena 3D cada vez que se elige un lote. Le pasa los pesajes a la vista por `onLoad`, que los reparte entre el panel y la diana de la escena. `usePlantTwin` invalida esa query cuando una foto trae un `weighing-added` o `weighing-voided` del lote abierto.

### Métricas de calidad (SPEC 15)

`/metricas` es el tablero de calidad: `routes/(portal)/_portal.metricas.tsx` → `views/metricas/QualityMetricsDashboard.tsx` → `useQualityMetrics` sobre `GET /metricas/calidad` (SPEC 35 del backend). Filtra por período, cliente y operador.

- **El permiso esconde un endpoint abierto.** `GET /metricas/calidad` responde a cualquier usuario autenticado. El item "Métricas" de `menuItems` (debajo de "Clientes") pide `VER-METRICAS` sólo para que un operario de báscula no tenga a la vista el rendimiento de los demás. El seed del permiso se corre a mano en la base del backend, y hay que volver a ingresar para verlo (SPEC 07). La portada no tiene acceso a Métricas.
- **El front no calcula nada.** Porcentajes y desviaciones llegan con 2 decimales, y `null` sin datos, que se pinta "—" y nunca `0`. La desviación tiene signo: positiva es por encima del ideal (`warning`), negativa por debajo (`destructive`).
- **El período del encabezado sale de la respuesta** (`metricas.periodo`), nunca del navegador, y el `YYYY-MM-DD` se parsea como fecha local con `parse` de `date-fns`.
- **Los presets no mandan `hasta`.** `buildQualityMetricsParams` (`hooks/metricas/qualityMetricsParams.ts`, con tests): "30 días" no manda fechas (es el default del backend); 7d, 90d y "Este mes" mandan sólo `desde`, y el backend completa `hasta` con su `CURDATE()` en UTC. Si el navegador mandara su "hoy", de noche el rango terminaría un día antes que los datos. Nunca se manda un param vacío: el endpoint responde 400.
- **Los filtros cambian en transición.** La ruta guarda dos copias: la de la barra cambia en el momento, y la del tablero en `startTransition`, así el tablero anterior queda atenuado (`opacity-60`, `aria-busy`) y no se cambia por un spinner. La primera carga sí suspende con `LoadingState`.
- **La barra de filtros sobrevive al error.** Se pinta entre el header y las tarjetas (slot `filterBar`), y el fallback del `ErrorBoundary` del tablero la vuelve a pintar: cambiar un filtro desde ahí limpia el error. Tiene su propio `<Suspense>`, porque sus selectores (`useClientInspection()` sin página y `useGetCatalogosUsuarios()`) también suspenden. Aplica al cambiar, sin botón Buscar. El click en una fila de la tabla por cliente filtra el tablero por ese cliente.
- **Los gráficos están hechos a mano**, con SVG y CSS en `components/metricas/`, sin librería de gráficos. Las pistas hundidas de anillos, barras y medidores usan el token `shadow-clay-inset`, cuyo inset claro sale de `--clay-inset-light` para que en oscuro no se vea como un halo. Los tonos y el formato numérico viven en `metricsStyles.ts` y `metricsFormat.ts`. Los estados de calidad se colorean por `codigo` (`IDEAL`/`MAXIMO`/`MINIMO`), nunca por id, y uno desconocido sale neutro. La escala de desviación tiene tope en ±50: un `peso_ideal` mal cargado aplastaría al resto contra el centro.

## Estilos

Tailwind v4 sin `tailwind.config.js`: los tokens viven en `src/styles.css` bajo `@theme`, con variables CSS redefinidas en `:root/.light` y `.dark`. Usar los tokens semánticos (`bg-surface`, `text-text-main`, `text-text-muted`, `border-border-ui`, `bg-bg-app`, `shadow-clay-card`, `shadow-clay-btn`) en vez de colores crudos cuando exista el token. El modo oscuro es por clase en `<html>` (`ThemeProvider`, persistido en `localStorage` bajo `bascula-ui-theme`) y se declara con `@variant dark (.dark &)`.

## Tests

Vitest sin archivo de configuración propio: los tests que necesiten DOM deben empezar con el docblock `// @vitest-environment jsdom`. El test de `useSerialScale` monta un `PuertoFalso` que simula el `SerialPort` (inyecta tramas, fuerza pérdida del dispositivo) — es la referencia para probar cualquier cambio en el hook.

## Formularios

react-hook-form + zod (`@hookform/resolvers`) a través de los wrappers `Controlled*` en `presentation/components/shared/inputs/` (`ControlledInput`, `ControlledSelector`, `ControlledDatePicker`), que reciben `control` y `name` tipados y ya pintan label y error.

## Tablas

`presentation/components/shared/table/DataTable.tsx` es la forma de pintar una tabla nueva. Corre sobre **TanStack Table v9** (`useTable`, `tableFeatures`, `<table.FlexRender>`) montado sobre la primitiva `components/ui/table.tsx` de shadcn, que **no se edita**: los tokens del proyecto se le pasan por `className` desde el `DataTable`. Los ejemplos de data-table que circulan por internet son de v8 (`useReactTable`, `getCoreRowModel`, `flexRender`, `declare module` para la `meta`) y **no compilan** acá; la referencia son las skills que el propio paquete trae en `node_modules/@tanstack/react-table/skills/` y `node_modules/@tanstack/table-core/skills/`.

La pantalla solo declara columnas (`ColumnDef` de la librería, tipadas con el alias `DataTableColumns<TData>`) y se las pasa junto a `data`; el `useTable` y el estado del orden viven adentro del componente. Props: `getRowId`, `onRowClick`, `defaultSorting`, `emptyTitle` / `emptyDescription`, `maxHeight` y `className`. La `meta` de columna —`align`, `headerClassName`, `cellClassName`— se tipa con `metaHelper` dentro de `dataTableFeatures`, no augmentando el módulo.

Cuatro comportamientos que conviene saber antes de tocarlo:

- **El orden es opt-in.** La librería ordena todas las columnas por defecto; acá `defaultColumn.enableSorting` es `false` y cada columna lo pide con `enableSorting: true`. También se fija `sortDescFirst: false`, porque si no una columna numérica arranca descendente y el ciclo sale al revés del resto de la tabla.
- **La carga es de `<Suspense>`.** El `DataTable` no tiene `isLoading` ni filas esqueleto, a propósito: los GET pasan por `useSuspenseQuery` (ver arriba) y el spinner es de la pantalla.
- **Filtrar y paginar son del hook de dominio**, que es quien conoce el endpoint y sus params. El `DataTable` sigue sin paginar ni buscar: pinta todas las filas que recibe. La página la tiene la ruta, la pide el hook y la pinta el `PaginationBar` (ver abajo).
- **`maxHeight` es lo que activa el header pegajoso.** El contenedor de scroll real es el `div[data-slot=table-container]` que monta la primitiva, y no acepta `className`: el alto máximo se le aplica desde el wrapper con una variante arbitraria sobre ese slot.

Ya no queda ninguna tabla a mano: `PesajesTable.tsx` (el `<table>` crudo del historial, con colores hardcodeados y paginación decorativa) se borró al migrar el historial a `/pesajes/historial`. Las celdas compartidas de pesajes —peso, badge de estado de calidad, valor vacío— viven en `presentation/components/pesajes/PesajeCells.tsx` y las usan tanto el historial como la inspección por lote.

### Paginación (SPEC 12)

Dos tablas paginan de a `TAMANO_PAGINA` (20, en `presentation/types/shared/paginacion.types.ts`): `/inspeccion-clientes` y `/historial`. La paginación del backend es **opt-in**: sin `pagina` ni `limite` responde la lista completa sin `paginacion`; con ellos, sólo las filas de la página y la clave hermana `paginacion: { pagina, limite, total, total_paginas }`. Por eso `paginacion` es opcional en `ClientesResponse` y `PesajesResponse`. `limite` viaja siempre explícito, para que el tamaño de página no dependa del default del backend. `/clientes` (la grilla de tarjetas) **no** pagina, a propósito.

- **La ruta tiene la página** en un `useState`, al lado de los filtros, y no en la URL. Aplicar filtros vuelve a la página 1, sin transición, así que sigue suspendiendo con el `LoadingState`.
- **El cambio de página va en `startTransition`.** Cada página es una `queryKey` nueva y `useSuspenseQuery` volvería a suspender: con la transición, React deja la tabla anterior en pantalla, atenuada con `opacity-60`, y el `isPending` deshabilita Anterior y Siguiente hasta que llega la nueva. `placeholderData` no existe en `useSuspenseQuery`, por eso no se toca `useExecuteQuery`. Una página ya visitada sale de la caché.
- **`PaginationBar`** (`components/shared/table/`, junto al `DataTable`) pinta "Página X de Y · N clientes", Anterior y Siguiente. Con `total === 0` no se renderiza: el estado vacío del `DataTable` ya lo dice.
- **El orden de columna ordena sólo la página visible.** El `DataTable` sigue ordenando en el cliente y el backend no acepta un param de orden. En `/inspeccion-clientes` el `defaultSorting` por nombre ordena las 20 filas de la página, que son las primeras por `created_at`, no las primeras del alfabeto. Es una decisión aceptada; arreglarlo es un param de orden en el backend.
- **`useClientInspection()` sin página es lo que mantiene completos los selectores.** El mismo hook alimenta la tabla, con `pagina`, y los tres selectores de cliente (`HistorialFiltersBar`, `DocumentosFiscalesFiltersBar`, `CreateDocumentoFiscalForm`), sin ella. Pasarle una página a un selector "para optimizar" lo deja mostrando 20 clientes sin avisar.