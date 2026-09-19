# SPEC 10 — Agri, el chat IA

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-09-19
> **Objetivo:** Crear la ruta `/agri`, una pantalla de chat con IA al estilo de Gemini o ChatGPT o Claude, con el hilo, el compositor, la pantalla de bienvenida con prompts sugeridos y una identidad visual propia, alimentada por un mock mientras no exista el endpoint.

---

## Por qué existe este spec

La app ya tiene IA adentro: `useAiSummary` pide `POST /lotes/{id}/resumen` y `AiSummaryDialog` lo pinta con `MarkdownContent animated`, palabra por palabra. Pero esa IA vive escondida dentro de un diálogo de una card, y el usuario la ve una vez cada tanto.

Agri es la jugada opuesta: una pantalla propia, con nombre propio, que el usuario abre para hablar. El objetivo del spec es tanto funcional como comercial —hay que demostrarle al usuario que el producto tiene IA moderna— así que la apariencia **es** parte del entregable y no un detalle de implementación.

Este spec entrega la pantalla completa y **no** el backend. El hook devuelve una respuesta simulada, igual que hacen hoy `useControlCalidad` y `useParametros`. Es la misma jugada de SPEC 08 con `/inspeccion-clientes`: la pantalla queda armada de punta a punta y conectar el endpoint toca **sólo** el interior del hook.

---

## Alcance

**Dentro:**

- Ruta nueva `src/routes/(portal)/_portal.agri.tsx` → URL `/agri`, dentro del portal, con el Sidebar de la app y la pantalla a altura completa.
- Hook de dominio `src/presentation/hooks/agri/useAgriChat.tsx`: el hilo en `useState`, el estado de "pensando", enviar, regenerar y empezar de cero.
- Mock `src/presentation/hooks/agri/agriMockResponse.ts`: una única respuesta markdown de ejemplo y la demora simulada.
- Tipos `src/presentation/types/agri/agri.types.ts`.
- Vista `src/presentation/views/agri/AgriChatView.tsx` y los componentes de `src/presentation/components/agri/`: avatar, burbuja, indicador de tipeo, compositor y bienvenida.
- Barra de acciones sobre la **última** respuesta de Agri: copiar y regenerar.
- Botón "Nueva conversación" en el header de la pantalla.
- Tokens nuevos en `src/styles.css` para el gradiente de Agri, más el keyframe de los tres puntos.
- Item nuevo en `src/presentation/components/shared/SideBar.tsx`, sin permiso.
- Sección de Agri en `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- **El endpoint del chat.** No existe y este spec no lo inventa: no se agrega ninguna URL a `useAgriChat`.
- **Streaming de tokens (SSE / `ReadableStream`).** `httpRequest` hoy sólo parsea `'json'` y `'blob'`; un tercer transporte es un spec propio, junto con el endpoint.
- **Persistencia.** El hilo vive en memoria: recargar la página lo vacía. Ni `localStorage` ni backend.
- **Historial de conversaciones.** No hay lista de chats ni segundo panel: una sola conversación por vez.
- **Contexto de dominio.** El front no manda ids de lote ni de cliente; el mensaje es sólo texto. Sin selector de contexto ni adjuntos.
- **Adjuntar archivos, imágenes o audio.** Sin micrófono y sin subida.
- **Detener la generación.** No hay botón de stop ni `AbortController`.
- **Editar un mensaje ya enviado** y reenviarlo.
- **Feedback de la respuesta** (pulgar arriba / abajo).
- **Permisos.** El item del Sidebar y la ruta no se envuelven en `<Can>` ni en un guard propio.
- **Tests de vitest.** Ninguno en este spec (ver Decisiones).
- Tocar `useAiSummary`, `AiSummaryDialog` o cualquier otra pantalla.
- Modificar `MarkdownContent`: se usa tal cual está.
- Modificar `(portal)/_portal.tsx`: el layout queda como está.

---

## Modelo de datos

Nada se persiste. Lo único que se introduce son los tipos del hilo, en `src/presentation/types/agri/agri.types.ts`:

```ts
export type AgriRole = 'user' | 'agri'

export interface AgriMessage {
    /** `crypto.randomUUID()`. Es la key de la lista y el ancla del scroll. */
    id: string
    role: AgriRole
    /** Markdown crudo. El del usuario también, para que se pinte con la misma tipografía. */
    content: string
}
```

Identificadores en inglés, como manda `CLAUDE.md` para código nuevo. El componente de la burbuja se llama `AgriBubble` y no `AgriMessage`, para no chocar con el tipo.

### El mock

`src/presentation/hooks/agri/agriMockResponse.ts` exporta dos constantes y nada más:

```ts
/** Lo que tarda Agri en "pensar". */
export const DEMORA_RESPUESTA_MS = 1400

/** Markdown de ejemplo: título, párrafo, lista, negritas, tabla y código. */
export const RESPUESTA_DE_EJEMPLO = `...`
```

El texto es siempre el mismo y habla del rubro (lotes, pesajes, humedad, calidad) para que la demo sea creíble. Ejercita a propósito todos los elementos de markdown que `MarkdownContent` sabe pintar: es lo que verifica que la tipografía del chat quedó bien en claro y en oscuro.

### Lo que devuelve el hook

```ts
interface UseAgriChat {
    messages: AgriMessage[]
    /** Agri está redactando: se pinta el indicador de tres puntos. */
    isThinking: boolean
    sendMessage: (content: string) => void
    /** Reemplaza la última respuesta de Agri volviendo a pedir el mismo mensaje. */
    regenerate: () => void
    /** Vacía el hilo y vuelve a la bienvenida. */
    startNewChat: () => void
}
```

---

## Plan de implementación

Cada paso deja el proyecto compilando y la app funcionando.

1. **Tokens y keyframes en `src/styles.css`.** Dos variables nuevas de color en `:root`/`.light` y su contraparte en `.dark` —`--agri-from` y `--agri-to`, un violeta que arranca del índigo de `--brand` y va al púrpura—, expuestas en `@theme` como `--color-agri-from` y `--color-agri-to`. Más un `@keyframes agri-dot` (opacidad y `translateY`) y la clase `.agri-dot` en `@layer components`, que es la que anima los tres puntos con su propio `animation-delay` por punto. La clase se agrega al mismo bloque de `prefers-reduced-motion: reduce` que ya neutraliza `.md-word`.
   Verificación: `npm run dev` y una `<div className="bg-linear-to-br from-agri-from to-agri-to">` de prueba pinta el gradiente en los dos temas.

2. **Crear los tipos y el mock.** `src/presentation/types/agri/agri.types.ts` con `AgriRole` y `AgriMessage`; `src/presentation/hooks/agri/agriMockResponse.ts` con `DEMORA_RESPUESTA_MS` y `RESPUESTA_DE_EJEMPLO`.
   Verificación: `npx tsc --noEmit` pasa.

3. **Crear `useAgriChat.tsx`.** Estado `messages` e `isThinking`. `sendMessage` empuja el mensaje del usuario, prende `isThinking` y arranca un `setTimeout` de `DEMORA_RESPUESTA_MS` que empuja la respuesta y lo apaga. El id del `setTimeout` vive en un `ref` y se limpia en el `return` del `useEffect` de desmontaje: si el usuario se va de la pantalla mientras Agri "piensa", el timer no sobrevive. `sendMessage` ignora el texto vacío y también ignora el envío mientras `isThinking` es `true`. `regenerate` descarta el último mensaje de Agri y repite el ciclo sobre el último del usuario; no hace nada si el hilo está vacío o si Agri está pensando. `startNewChat` limpia el timer pendiente, vacía el hilo y apaga `isThinking`.
   Verificación: `npx tsc --noEmit` pasa.

4. **`AgriAvatar.tsx`.** El cuadrado redondeado con el gradiente `from-agri-from to-agri-to`, el ícono `Sparkles` de lucide en blanco y un anillo interior tenue, con una prop `size` para las dos medidas en que se usa (la burbuja y la bienvenida). Es la marca de Agri y se reusa en el Sidebar.
   Verificación: se monta suelto en la ruta y se ve en los dos temas.

5. **`AgriBubble.tsx`.** Dos formas según `role`:
   - `user`: alineada a la derecha, fondo `bg-brand` con texto `text-brand-foreground`, esquinas redondeadas con la de abajo a la derecha más chica, ancho máximo del 75% de la columna.
   - `agri`: alineada a la izquierda, **sin globo** —avatar arriba a la izquierda y el texto suelto sobre el fondo, como Gemini—, pintado con `<MarkdownContent content={...} animated />`. `animated` se pasa siempre: cada burbuja se monta una sola vez (la key es el `id`), así que la animación corre para la respuesta que llega y no para las que ya estaban.

   La barra de acciones (copiar, regenerar) se recibe como `children` y sólo la manda la vista para la última respuesta.
   Verificación: con un hilo de prueba en duro, las dos formas se ven distintas y el markdown respeta la tipografía.

6. **`AgriTypingIndicator.tsx`.** El avatar más tres `<span className="agri-dot">` con `animation-delay` escalonado, sobre un fondo apenas más claro. Lleva `role="status"` y un `aria-label` "Agri está escribiendo" para que el lector de pantalla lo anuncie.
   Verificación: forzando `isThinking` a `true`, los puntos rebotan; con "reducir movimiento" activado en el sistema, quedan quietos y visibles.

7. **`AgriComposer.tsx`.** El compositor anclado abajo: un `<textarea>` que crece con el contenido hasta un tope y después scrollea, dentro de una cápsula `rounded-[28px] bg-surface border border-border-ui shadow-clay-card` que gana un halo con el gradiente de Agri al recibir foco. Enter envía y Shift+Enter hace salto de línea. El botón de enviar es circular, con el gradiente y el ícono `ArrowUp`, y está deshabilitado con el textarea vacío o mientras `isThinking`. Debajo, una línea chica: "Agri puede equivocarse. Verificá los datos críticos."
   Verificación: el textarea crece hasta el tope, Enter envía, Shift+Enter no.

8. **`AgriWelcome.tsx`.** Lo que se ve con el hilo vacío: el avatar grande, el saludo con el nombre del usuario (`useAuth`) en un texto con el gradiente aplicado por `bg-clip-text`, una bajada de una línea, y cuatro chips de prompts sugeridos del rubro. Los chips son botones y disparan `sendMessage` con su texto. Los cuatro textos se declaran en una constante del propio archivo.
   Verificación: la pantalla vacía se ve centrada y los chips envían.

9. **`AgriChatView.tsx`.** Arma la columna: header con el avatar chico, el nombre "Agri", la bajada y el botón "Nueva conversación" (`CustomButton variant="secondary"`, ícono `SquarePen`, deshabilitado con el hilo vacío); el área del hilo con `flex-1 overflow-y-auto` y ancho máximo centrado; y el compositor abajo. El scroll baja solo al final cuando llega un mensaje o se prende `isThinking`, con un `ref` al fondo del hilo y `scrollIntoView({ behavior: 'smooth' })`. La barra de acciones se pinta sobre la última burbuja de Agri, y sólo si `isThinking` es `false`. Copiar usa `navigator.clipboard.writeText` y cambia el ícono a `Check` por dos segundos.
   Verificación: enviar tres mensajes largos deja el hilo scrolleado abajo y el compositor siempre visible.

10. **Crear la ruta `src/routes/(portal)/_portal.agri.tsx`.** `createFileRoute('/(portal)/_portal/agri')` y adentro un contenedor `h-[calc(100vh-4rem)] flex flex-col` que monta `<AgriChatView />`. Ese `4rem` es el `p-8` del `<main>` del layout: es lo que evita tocar `_portal.tsx`. **Sin `<Suspense>` y sin `ErrorBoundary` propios**: no hay ningún `useSuspenseQuery` en la pantalla, y el layout ya envuelve al `<Outlet/>`.
    Verificación: `/agri` carga, el Sidebar sigue ahí y la página **no** scrollea: scrollea el hilo.

11. **Agregar Agri al Sidebar.** Un bloque propio arriba de la etiqueta "Operación", fuera del `menuItems.map` para no tocar la lógica de permisos existente: un `<Link to="/agri">` con el `AgriAvatar` chico como chip, el label "Agri", un sublabel "Asistente IA" y el estado activo del resto de los items. Sin `permission`.
    Verificación: el item aparece para cualquier usuario logueado, se marca activo en `/agri` y el resto del menú se comporta igual.

12. **Actualizar `CLAUDE.md`.** Una sección corta de Agri: dónde vive la pantalla, que el hook es un mock y que conectar el backend toca sólo su interior, que no hay streaming ni persistencia, y que los tokens `agri-from`/`agri-to` son de esta pantalla y no de la app.

13. **Verificación final:** `npx tsc --noEmit` y `npx vitest run` completos, más el recorrido manual de los criterios de aceptación en los dos temas.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo, sin tests nuevos ni tests rotos.
- [ ] El Sidebar muestra el item "Agri" y lleva a `/agri`; estando en `/agri` el item se ve activo.
- [ ] `/agri` carga dentro del portal, con el Sidebar visible.
- [ ] Con el hilo vacío se ve la bienvenida: avatar, saludo con el nombre del usuario y cuatro chips de prompts.
- [ ] Un click en un chip envía ese texto y la bienvenida desaparece.
- [ ] Al enviar, el mensaje del usuario aparece al instante, alineado a la derecha y con el fondo de marca.
- [ ] Mientras Agri responde se ve el indicador de tres puntos animados, y no el `LoadingState` de la app.
- [ ] La respuesta de Agri aparece palabra por palabra y pinta el markdown: título, lista, negritas, tabla y bloque de código.
- [ ] Las respuestas anteriores **no** se vuelven a animar cuando llega una nueva.
- [ ] El botón de enviar está deshabilitado con el textarea vacío y mientras Agri responde.
- [ ] Enter envía el mensaje; Shift+Enter agrega un salto de línea sin enviar.
- [ ] El textarea crece con el contenido hasta su tope y después scrollea por dentro.
- [ ] Al llegar un mensaje, el hilo scrollea solo hasta abajo.
- [ ] La página **no** scrollea: el compositor queda siempre visible al pie y el que scrollea es el hilo.
- [ ] La barra de acciones aparece sobre la última respuesta de Agri y sólo sobre esa.
- [ ] "Copiar" deja el markdown de la respuesta en el portapapeles y el ícono cambia a un tilde por dos segundos.
- [ ] "Regenerar" reemplaza la última respuesta de Agri sin duplicar el mensaje del usuario.
- [ ] "Nueva conversación" vacía el hilo y vuelve a la bienvenida; está deshabilitado con el hilo ya vacío.
- [ ] Salir de `/agri` mientras Agri está respondiendo no tira ningún warning de actualización de estado en un componente desmontado.
- [ ] En modo oscuro son legibles el header, las dos burbujas, los chips, el indicador y el compositor; el gradiente de Agri se ve en ambos temas.
- [ ] Con "reducir movimiento" activado en el sistema, ni los puntos ni el texto palabra por palabra se animan, y todo el contenido se ve igual.
- [ ] `useAgriChat.tsx` no contiene ninguna URL ni llama a `httpRequest`, `useExecuteQuery` o `useExecuteMutation`.
- [ ] `MarkdownContent.tsx`, `AiSummaryDialog.tsx`, `useAiSummary.tsx` y `(portal)/_portal.tsx` quedan sin cambios.
- [ ] `CLAUDE.md` documenta la pantalla y que el hook es un mock.

---

## Decisiones

- **Sí:** el hook devuelve un mock. Decisión del usuario. El endpoint no existe y esperarlo congelaría el diseño, que es lo que este spec viene a entregar. Es el mismo patrón de `useControlCalidad` y `useParametros`, y el de `/inspeccion-clientes` en SPEC 08: la pantalla queda completa y el backend entra por un solo archivo.
- **No:** inventar la URL del chat y dejarla escrita "para cuando exista". Un endpoint imaginado en el código es una decisión de contrato tomada sin el backend.
- **No:** streaming de tokens. Decisión del usuario. `createHttpClient` hoy elige entre `'json'` y `'blob'`; leer un `ReadableStream` es un transporte nuevo, y agregarlo acá metería la capa HTTP dentro de un spec de pantalla. La animación palabra por palabra de `MarkdownContent` ya da la sensación de escritura progresiva.
- **Sí:** el hilo vive en memoria. Decisión del usuario. Sin backend de conversaciones, persistir en `localStorage` obliga a decidir versionado, límite de tamaño y borrado, para guardar respuestas que hoy son de mentira.
- **No:** lista de conversaciones en un panel propio. Sin persistencia no hay nada que listar; el día que el backend guarde hilos, es su propio spec y probablemente su propio layout de tres columnas.
- **Sí:** dentro del portal, con el Sidebar. Decisión del usuario. Agri es una pantalla más de la app, y una ruta full-screen obligaría a inventar un botón de volver y a duplicar la navegación.
- **Sí:** el alto se resuelve desde la ruta con `h-[calc(100vh-4rem)]`. Es exactamente el `p-8` del `<main>` del layout, y deja `_portal.tsx` sin tocar. La alternativa —cambiar el layout a `h-screen` con `overflow-hidden`— afectaría a las otras nueve pantallas.
- **Sí:** chat genérico, sin contexto de dominio. Decisión del usuario. Adjuntar un lote exige un contrato de backend que no está definido; los prompts sugeridos alcanzan para que la pantalla se vea del rubro.
- **Sí:** tokens del proyecto más un acento propio de Agri. Decisión del usuario. Los dos tokens nuevos se usan sólo en esta pantalla y en su item del Sidebar; el resto sale de `bg-surface`, `text-text-main` y compañía, así que la pantalla se ve distinta sin dejar de ser la misma app.
- **No:** identidad visual completa con aurora animada y glassmorphism. Es el doble de superficie que mantener en claro y en oscuro, y en tablets de planta un fondo animado permanente se paga en batería.
- **No:** cero colores nuevos. Era la opción más coherente y se descartó explícitamente: el punto del spec es que Agri se vea moderno, y con los tokens actuales la pantalla se vería igual que el historial.
- **Sí:** la burbuja de Agri no tiene globo. Es lo que hacen Gemini y ChatGPT, y con markdown de varios párrafos un globo encerrado se lee peor que el texto suelto.
- **Sí:** copiar y regenerar, sobre la última respuesta nada más. Decisión del usuario. Una barra en cada burbuja llena el hilo de íconos, y regenerar una respuesta del medio dejaría el hilo inconsistente.
- **No:** detener la generación. Con un `setTimeout` de 1.4s el botón de stop nunca llega a usarse; entra junto con el endpoint real, donde sí significa algo.
- **No:** feedback de pulgar arriba / abajo. Sin backend que lo reciba es un botón que no hace nada.
- **Sí:** indicador de tres puntos, no el `LoadingState` de la app. Decisión del usuario. El `LoadingState` (spinner + ícono de marca) es el loading de una pantalla que carga; dentro de un hilo se leería como que la conversación se está cargando, no como que Agri está escribiendo.
- **Sí:** botón "Nueva conversación". Decisión del usuario. Sin él, la única forma de limpiar el hilo es recargar la página.
- **Sí:** una sola respuesta de ejemplo en el mock. Decisión del usuario. Un matcher por palabras clave es lógica que se va a borrar el día que llegue el backend; la respuesta fija, en cambio, sirve de banco de pruebas de la tipografía porque ejercita todos los elementos de markdown.
- **Sí:** el item del Sidebar va sin permiso. Decisión del usuario. `PERMISSIONS` sólo lleva strings verificados contra el backend, y un `MODULO-AGRI` que el backend no emite escondería el item para todos —que es justo lo contrario de lo que este spec quiere mostrar.
- **No:** tests de vitest. Decisión del usuario. Lo único con lógica es un `setTimeout` que se va a borrar cuando llegue el endpoint; los tests valen la pena sobre el hook ya conectado.
- **Sí:** identificadores en inglés (`AgriMessage`, `sendMessage`, `isThinking`, `startNewChat`), texto de UI y comentarios en español. Archivos nuevos, regla de `CLAUDE.md`.
- **Sí:** `MarkdownContent` se reusa tal cual, sin `rehype-raw`. Ya resuelve la tipografía sobre los tokens del proyecto y la animación palabra por palabra, y el día que la respuesta venga de una IA de verdad, el HTML que traiga adentro se sigue mostrando como texto en vez de ejecutarse.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El `h-[calc(100vh-4rem)]` de la ruta depende de que el `<main>` del layout siga en `p-8`. Si alguien cambia ese padding, el chat queda corto o desborda. | El valor va con un comentario que nombra el `p-8` de `(portal)/_portal.tsx`, y hay un criterio de aceptación sobre que la página no scrollea. |
| El usuario cree que Agri ya contesta de verdad y lo muestra a un cliente como si fuera IA productiva. | La respuesta del mock habla en términos genéricos y el compositor lleva el aviso fijo "Agri puede equivocarse". Aun así, es una decisión de producto: mientras no haya endpoint, la demo es una demo. |
| La animación palabra por palabra se vuelve a disparar en respuestas viejas si una burbuja se remonta (por ejemplo, si se usa el índice del array como key). | Las burbujas se keyean por `id`, que es un `randomUUID` estable. Hay un criterio de aceptación específico. |
| El `setTimeout` del mock resuelve después de que el usuario dejó `/agri`, y React avisa por consola. | El id vive en un `ref` y el `useEffect` de desmontaje lo limpia, igual que hace `useSerialScale` con sus timers. Hay un criterio de aceptación específico. |
| `navigator.clipboard` no existe fuera de un contexto seguro (HTTP sin TLS en una tablet de planta), y "Copiar" tira una excepción. | El handler va dentro de un `try/catch` y avisa el fallo con `toast.error`. |
| El gradiente de Agri no contrasta lo suficiente sobre el fondo oscuro y el texto blanco del avatar se pierde. | Los dos tokens se declaran con valores distintos en `.light` y en `.dark`, como ya hace `--brand`, y hay un criterio de dark mode. |
| Un hilo largo monta muchas burbujas y cada respuesta de Agri parte su markdown en cientos de `span`. | Sin persistencia, un hilo se muere al recargar y no llega a crecer. Si llega a doler cuando exista el backend, la respuesta es virtualizar o dejar de animar los mensajes viejos, y va en el spec del endpoint. |

---

## Lo que **no** entra en este spec

- El endpoint del chat: `useAgriChat` no llama a ninguna URL.
- Streaming de tokens (SSE o `ReadableStream`) y el transporte que haría falta en la capa HTTP.
- Persistencia del hilo, en `localStorage` o en backend.
- Historial de conversaciones y su panel.
- Contexto de dominio: adjuntar un lote o un cliente al mensaje.
- Adjuntos, imágenes, micrófono o dictado.
- Detener la generación y editar un mensaje ya enviado.
- Feedback de la respuesta (pulgar arriba / abajo).
- Permisos sobre `/agri`, en el Sidebar o en la ruta.
- Tests de vitest.
- Cambios en `MarkdownContent`, `useAiSummary`, `AiSummaryDialog` o `(portal)/_portal.tsx`.

Cada uno de ellos, si se hace, va en su propio spec.
