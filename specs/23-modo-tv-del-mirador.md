# SPEC 23 — Modo TV del Mirador

> **Estado:** Implemented
> **Depende de:** SPEC 13 (Mirador conectado a la planta en vivo), SPEC 17 (manual de usuario)
> **Fecha:** 2026-10-21
> **Objetivo:** Agregar a `/mirador` un botón **Modo TV** que pone el tablero en pantalla completa y recorre solo los clientes con lotes activos, deteniéndose en cada pesaje fuera de rango.

---

## Por qué existe este spec

El Mirador ya tiene pantalla completa para dejarlo en un televisor, pero una pantalla quieta en la vista de planta no le dice nada a quien pasa por delante. Un gerente o un supervisor quiere ver cliente por cliente cómo va el día, y enterarse de un pesaje fuera de rango sin tener que buscarlo.

La escena ya sabe mover la cámara: `PlantScene.focusCamera` (`scene/PlantScene.ts`) la lleva a lo que esté seleccionado. Por eso el recorrido es, sobre todo, un hook que cambia la selección con un timer. La escena sólo gana un modo de cámara más lento y con un giro suave.

Una regla atraviesa todo el spec: **el recorrido no agrega pedidos al backend**. Recorre la foto que ya trajo `GET /plantas/en-vivo`, sin tocar el polling del SPEC 13. Seleccionar un lote monta `LotWeighingsLoader`, que hace un `GET /pesajes/byLote/:loteId`. Por eso las paradas son siempre a nivel cliente, y sólo una alerta entra a un lote.

---

## Alcance

**Entra:**

- Botón **Modo TV** en `PlantControls`, que activa a la vez la pantalla completa y el recorrido.
- Recorrido automático: la vista de planta (10 s) y después cada cliente con lotes en **En pesaje** o **Por aprobar** (15 s cada uno), en el orden de las filas de la escena.
- Alerta: un pesaje nuevo fuera de rango interrumpe el recorrido y lleva la cámara a ese pesaje durante 12 s. Después el recorrido sigue.
- Pausa automática ante cualquier interacción con el tablero, que se retoma sola a los 90 s sin interacción.
- Pausa manual con **Pausar** / **Reanudar**, que no se retoma sola.
- Indicador del recorrido arriba del tablero: parada actual, barra de tiempo, **Pausar** / **Reanudar** y **Salir del modo TV**.
- En el modo TV, KPIs más grandes, y `PlantControls` y `PlantBreadcrumbs` ocultos.
- Cámara "cinemática" en el modo TV: transición más lenta entre paradas y un giro suave mientras está quieta.
- Wake Lock de pantalla mientras el modo está activo.
- Tests de la lógica pura del recorrido.
- Manual de usuario y `CLAUDE.md`.

**Fuera de alcance (para futuros specs):**

- Arranque directo por URL (`?tv=1`) para un televisor en modo kiosko. Depende además del refresh de sesión, que el backend todavía no tiene.
- Colorear los lotes por calidad o filtrar sólo las excepciones (ideas 2 y 3 de la conversación).
- Otras alertas: lote rechazado, lote que pasa a **Por aprobar**.
- Visitar clientes que sólo tienen lotes **Finalizado**.
- Esconder el cursor por inactividad.
- Tiempos configurables desde la pantalla.
- Recorrer lotes dentro de cada cliente.
- Un permiso propio para el modo TV.

---

## Modelo de datos

### Lógica pura del recorrido

`src/presentation/hooks/mirador/plantTour.ts` (nuevo), sin React:

```ts
export const TOUR_PLANT_DWELL_MS = 10_000
export const TOUR_CLIENT_DWELL_MS = 15_000
export const TOUR_ALERT_DWELL_MS = 12_000
export const TOUR_RESUME_AFTER_MS = 90_000

export type TourStop = { kind: 'planta' } | { kind: 'cliente'; clientId: number }

export interface TourAlert {
    clientId: number
    lotId: number
    weighingId: number
}
```

Tres funciones:

- `buildTourStops(snapshot: PlantSnapshot, slots: SlotMap): TourStop[]` arma la lista de paradas.
  - La primera parada es siempre `{ kind: 'planta' }`.
  - Después vienen los clientes con al menos un lote en `'en-pesaje'` o `'por-aprobar'`, ordenados por `slots.rows[cliente.id]` ascendente.
  - Un cliente sin fila en `slots.rows` no entra.
  - Sin clientes activos, la lista es `[{ kind: 'planta' }]`.
- `nextTourStop(stops: TourStop[], current: TourStop | null): TourStop` elige la parada siguiente.
  - Busca la parada actual **por `clientId`**, no por índice, y devuelve la siguiente de la lista recalculada.
  - Después de la última vuelve a `planta`.
  - Si el cliente actual ya no está en la lista (salió de la foto o ya no tiene lotes activos), sigue con el primer cliente cuya fila sea mayor que la que tenía. Si no hay ninguno, vuelve a `planta`.
  - Con `current === null`, devuelve `planta`.
- `pickTourAlert(events: PlantEvent[]): TourAlert | null` elige la alerta de una foto.
  - Toma los `weighing-added` con `weighing.fuera_de_rango === true`.
  - Si hay varios, devuelve el de mayor `weighing.id`. Una foto con seis pesajes malos produce una sola alerta.
  - Sin ninguno, devuelve `null`.

`nextTourStop` recibe también la fila anterior del cliente para resolver el caso del cliente que salió. La firma exacta se cierra en la implementación, con sus tests.

### Estado del hook

`src/presentation/hooks/mirador/usePlantTour.ts` (nuevo):

```ts
type TourStatus = 'off' | 'running' | 'paused-auto' | 'paused-manual'

interface TourState {
    status: TourStatus
    stop: TourStop | null
    /** Mientras no es `null`, la cámara está en el pesaje fuera de rango. */
    alert: TourAlert | null
    /** Cambia con cada parada o alerta: reinicia la barra de tiempo. */
    stopKey: number
}
```

Lo que devuelve:

```ts
{
    active: boolean          // status !== 'off'
    status: TourStatus
    stop: TourStop | null
    alert: TourAlert | null
    position: { index: number; total: number } | null   // de los clientes; null en planta o alerta
    dwellMs: number          // duración de la parada actual, para la barra
    stopKey: number
    start: () => void
    exit: () => void
    togglePause: () => void
}
```

Recibe `{ snapshot, slots, events, seq, selection, select }` del `PlantTwin` y un `enabled: boolean`.

- **Selección.** Cada parada llama a `select({ clientId })`, o a `select({})` para la planta. Una alerta llama a `select({ clientId, lotId, weighingId })`, que abre el `WeighingPanel` del pesaje.
- **Timers.** Un único `setTimeout` por parada, con la duración de esa parada. Se limpia al cambiar de parada, al pausar, al salir y al desmontar.
- **Alertas.** Se evalúan una vez por `seq`, con `pickTourAlert(events)`, y sólo con `status === 'running'`. Una alerta durante otra alerta la reemplaza. Al terminar la alerta, el recorrido sigue con `nextTourStop` desde el cliente de la alerta.
- **Pausa automática.** El hook escucha `pointerdown`, `wheel` y `keydown` en el contenedor del Mirador, en fase de captura. Con `status === 'running'` pasa a `'paused-auto'`. Cada interacción reinicia un timer de `TOUR_RESUME_AFTER_MS`.
- **Retomar.** Al vencer ese timer, el recorrido sigue con `nextTourStop` desde el cliente de la selección actual. Si el usuario navegó al cliente X, el recorrido sigue después de X.
- **Pausa manual.** `togglePause` alterna entre `'running'` y `'paused-manual'`. En `'paused-manual'`, la interacción no arma ningún timer, y sólo **Reanudar** la saca.
- **Durante una pausa** no se evalúan alertas: quien toca el tablero está leyendo algo.
- **`enabled`.** Con `enabled` en `false`, el hook pasa a `'off'` y limpia sus timers. No toca la selección: el usuario queda donde estaba.

El hook no persiste nada. Recargar vuelve al modo normal, y la pantalla completa también se pierde.

### Activación en la vista

`PlantTwinView` guarda un `tvRequested` en un `useState`.

- **Modo TV** pone `tvRequested = true` y llama a `pantallaCompleta.toggle()`.
- El recorrido está habilitado con `enabled = tvRequested && pantallaCompleta.active`.
- Al salir de la pantalla completa, por Esc, por el botón o por el gesto del sistema, `pantallaCompleta.active` pasa a `false`. La vista pone `tvRequested = false` y el recorrido termina.
- **Salir del modo TV** llama a `pantallaCompleta.toggle()` y sale por el mismo camino.
- El botón de pantalla completa de siempre sigue existiendo, y sin el recorrido.
- Si el navegador rechaza la pantalla completa, `active` no cambia y no pasa nada, igual que hoy.

### Cambios en la vista durante el modo TV

- `PlantControls` y `PlantBreadcrumbs` no se pintan.
- `PlantKpiBar` recibe `size="tv"`.
- `PlantBrandCard`, el panel lateral y `PlantActivityFeed` siguen como están.
- `PlantTourIndicator` se pinta debajo de los KPIs, en el lugar de las migas.
- `altoHud` pasa a `200` para que la escena se centre bajo los KPIs más grandes.

### Componentes

**`PlantControls`** gana una prop opcional `onStartTv?: () => void`. Sin ella, el botón no se pinta.

- El botón va después del de pantalla completa, con el ícono `MonitorPlay` de `lucide-react`.
- Lleva `aria-label="Modo TV"` y `title="Modo TV: pantalla completa y recorrido automático"`.
- La vista lo pasa sólo con `pantallaCompleta.supported` y el panel lateral (`lateral`, desde 768 px). En el teléfono no aparece.

**`PlantKpiBar`** gana `size?: 'normal' | 'tv'`, con `'normal'` por defecto.

- En `'tv'`, el valor pasa de `text-[22px]` a `text-[34px]`, la etiqueta de `text-[11px]` a `text-sm`, y el `min-w` de la tarjeta de `118px` a `170px`.
- El contenido de las tarjetas no cambia.

**`PlantTourIndicator`** (`components/mirador/`, nuevo) recibe el resultado de `usePlantTour`, el nombre del cliente actual y los callbacks.

- Es una tarjeta con el estilo `GLASS` de `format.ts`, con `pointer-events-auto`.
- El texto depende del estado:

  | Estado | Texto |
  | --- | --- |
  | Parada de planta | `Recorrido · Toda la planta` |
  | Parada de cliente | `Recorrido · 3 de 8 · {cliente}` |
  | Sin clientes activos | `Recorrido · Sin lotes activos` |
  | Alerta | `Fuera de rango · {cliente}`, en el tono `destructive` |
  | Pausa automática o manual | `En pausa` |

- La barra de tiempo es una animación CSS de `width` de 0 a 100 % con `animation-duration: dwellMs`, y `key={stopKey}` para que reinicie en cada parada. No re-renderiza React en cada frame. En pausa no se pinta.
- Los botones son **Pausar** o **Reanudar** (íconos `Pause` / `Play`) y **Salir del modo TV** (ícono `X`).
- Con `prefers-reduced-motion`, la barra no se anima y no se pinta.

### Escena

`PlantScene` gana un método `setCinematic(on: boolean)`, y `PlantCanvas` una prop `cinematic: boolean` que lo llama en un `useEffect`.

- **Ritmo.** En `updateCamera`, la constante de interpolación pasa de `5.5` a `1.5` con `cinematic` activo. No afecta la intro, que ya usa `2.2`.
- **Giro.** Con `cinematic` activo, el `theta` con el que se posiciona la cámara suma `0.22 · sin(2π · t / 40 s)`.
  - Se suma al valor pintado, **no** a `goal.theta`. Así no se acumula, y el arrastre del usuario sigue funcionando igual.
  - El giro se aplica también en la vista de planta.
- Con `reduceMotion`, `setCinematic` no hace nada: ni ritmo lento ni giro.

### Wake Lock

`src/presentation/hooks/mirador/useWakeLock.ts` (nuevo): `useWakeLock(active: boolean)`.

- Con `active` pide `navigator.wakeLock.request('screen')`, y lo libera al pasar a `false` y al desmontar.
- El navegador suelta el lock al ocultar la pestaña. Por eso el hook lo vuelve a pedir en `visibilitychange` cuando la pestaña vuelve a estar visible y `active` sigue en `true`.
- Si el navegador no tiene `navigator.wakeLock` o rechaza el pedido, se ignora en silencio, igual que `requestFullscreen` en `useFullscreen`.
- Los tipos de la Wake Lock API ya vienen en `lib.dom` de TypeScript. Si faltaran, se declaran en `src/global.d.ts`, como los de Web Serial.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/hooks/mirador/plantTour.ts` | Nuevo. Constantes, tipos, `buildTourStops`, `nextTourStop`, `pickTourAlert`. |
| `src/presentation/hooks/mirador/plantTour.test.ts` | Nuevo. Tests de las tres funciones. |
| `src/presentation/hooks/mirador/usePlantTour.ts` | Nuevo. Timers, alertas, pausas. |
| `src/presentation/hooks/mirador/useWakeLock.ts` | Nuevo. |
| `src/presentation/components/mirador/PlantTourIndicator.tsx` | Nuevo. |
| `src/presentation/components/mirador/PlantControls.tsx` | Botón **Modo TV** (`onStartTv`). |
| `src/presentation/components/mirador/PlantKpiBar.tsx` | Prop `size`. |
| `src/presentation/components/mirador/PlantCanvas.tsx` | Prop `cinematic`. |
| `src/presentation/components/mirador/scene/PlantScene.ts` | `setCinematic`, ritmo y giro en `updateCamera`. |
| `src/presentation/views/mirador/PlantTwinView.tsx` | `tvRequested`, `usePlantTour`, `useWakeLock` y el HUD del modo TV. |
| `docs/manual/MANUAL.md` | Modo TV en la sección 5.4 y línea en **Sin publicar**. |
| `docs/manual/README.md` | Fila de la captura nueva `5-4-mirador-modo-tv.png`. |
| `CLAUDE.md` | Párrafo del modo TV en la sección del Mirador. |

---

## Plan de implementación

1. Crear `plantTour.ts` con las constantes, los tipos y las tres funciones, y `plantTour.test.ts`. Los tests cubren:
   - Paradas ordenadas por fila.
   - Un cliente con sólo lotes **Finalizado** queda afuera.
   - Sin clientes activos, la lista es sólo la planta.
   - Después del último cliente se vuelve a la planta.
   - Un cliente que salió de la foto hace seguir con el siguiente por fila.
   - Un solo `weighing-added` fuera de rango por foto, el de mayor id.
   - Sin pesajes fuera de rango no hay alerta.

   Verificación: `npx vitest run src/presentation/hooks/mirador/plantTour.test.ts` en verde. Nada lo usa todavía.
2. Agregar `setCinematic` a `PlantScene` y la prop `cinematic` a `PlantCanvas`, que la vista pasa en `false`. Verificación: `npx tsc --noEmit` sin errores, y el Mirador se ve igual. Prueba manual: con `cinematic` forzado en `true`, la cámara se mueve más lento al elegir un cliente y gira suave mientras está quieta.
3. Agregar la prop `size` a `PlantKpiBar`, todavía sin usar. Verificación: `npx tsc --noEmit` y el tablero igual.
4. Crear `useWakeLock`. Verificación: `npx tsc --noEmit`. Nada lo usa todavía.
5. Crear `usePlantTour`, sin cablearlo. Verificación: `npx tsc --noEmit`.
6. Crear `PlantTourIndicator`. Verificación: `npx tsc --noEmit`.
7. Agregar `onStartTv` a `PlantControls` y cablear todo en `PlantTwinView`: `tvRequested`, `enabled`, `usePlantTour`, `useWakeLock(tour.active)`, `cinematic={tour.active}`, el HUD del modo TV y `altoHud`. Prueba manual en Chrome de escritorio:
   - **Modo TV** entra en pantalla completa y arranca en la vista de planta.
   - El recorrido pasa por cada cliente con lotes activos y vuelve a la planta.
   - Mover el mouse sobre el tablero no pausa. Un click sí, y el recorrido se retoma a los 90 s.
   - **Pausar** detiene el recorrido hasta **Reanudar**.
   - Esc sale de la pantalla completa y del recorrido.
   - En la pestaña Red de DevTools no aparece ningún pedido nuevo mientras recorre los clientes.
8. Actualizar `docs/manual/MANUAL.md`. En la sección 5.4, un bloque nuevo **Dejar el Mirador en un televisor**, después de **Moverse por el tablero**, que cuente:
   - El botón **Modo TV**.
   - Que el tablero pasa solo por cada cliente que tiene lotes en pesaje o por aprobar.
   - Que un pesaje fuera de rango se muestra enseguida, con su detalle.
   - Que tocar el tablero pausa el recorrido y que se retoma solo al rato.
   - **Pausar**, **Reanudar** y **Salir del modo TV**.
   - Que la pantalla no se apaga mientras el modo está activo.
   - Que para el televisor conviene un equipo con Chrome o Edge.

   Agregar también **Modo TV** a la lista de **Moverse por el tablero** y una línea en **Sin publicar**. En `docs/manual/README.md`, una fila `5-4-mirador-modo-tv.png` en **Pendiente**. `5-4-mirador.png` sigue en **Pendiente**: no hay nada que rehacer.
9. Agregar a `CLAUDE.md`, en la sección del Mirador, un párrafo **Modo TV (SPEC 23)** con estas reglas:
   - El recorrido sólo cambia la selección.
   - No agrega pedidos.
   - Sus paradas son de cliente, y sólo una alerta entra a un pesaje.
   - Las alertas son sólo los pesajes fuera de rango.
   - El giro se suma al `theta` pintado, no a `goal.theta`.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` no da errores.
- [X] `npx vitest run src/presentation/hooks/mirador/` pasa en verde, con los tests nuevos de `plantTour.test.ts`.
- [X] En Chrome de escritorio, con el panel lateral, `PlantControls` muestra el botón **Modo TV**.
- [X] Con menos de 768 px de ancho, o sin Fullscreen API, el botón **Modo TV** no aparece.
- [X] **Modo TV** pone el Mirador en pantalla completa y el indicador muestra `Recorrido · Toda la planta`.
- [X] A los 10 s de la planta, la cámara va al primer cliente con lotes activos, el panel muestra su `ClientPanel` y el indicador muestra `Recorrido · 1 de N · {cliente}`.
- [X] Cada cliente se muestra 15 s, en el orden de las filas de la escena, y después del último el recorrido vuelve a la planta.
- [X] Un cliente cuyos lotes son todos **Finalizado** no es una parada.
- [X] Sin clientes activos, el recorrido se queda en la planta con `Recorrido · Sin lotes activos`.
- [X] Una foto con un pesaje nuevo fuera de rango lleva la cámara a ese pesaje, el panel muestra su `WeighingPanel` y el indicador muestra `Fuera de rango · {cliente}`, durante 12 s.
- [X] Después de una alerta, el recorrido sigue con el cliente siguiente al de la alerta.
- [X] Una foto con varios pesajes fuera de rango produce una sola alerta, la del pesaje de mayor id.
- [X] Una alerta no llega con el recorrido en pausa.
- [X] Un click, una rueda o una tecla sobre el tablero pausa el recorrido y el indicador muestra `En pausa`.
- [X] Sin interacción durante 90 s, el recorrido se retoma desde el cliente que esté seleccionado.
- [X] **Pausar** detiene el recorrido, y sin **Reanudar** no se retoma solo.
- [X] Esc, **Salir del modo TV** y el botón de pantalla completa terminan el recorrido, y la selección queda donde estaba.
- [X] El botón de pantalla completa de siempre entra en pantalla completa sin el recorrido.
- [X] Durante el recorrido no se pintan `PlantControls` ni `PlantBreadcrumbs`, y los KPIs se ven con los números más grandes.
- [X] Durante el recorrido entre clientes, la pestaña Red no muestra pedidos nuevos fuera del `GET /plantas/en-vivo` de siempre.
- [X] Una alerta hace como mucho un `GET /pesajes/byLote/:loteId`.
- [X] Con el modo TV activo, la cámara se mueve más lento entre paradas y gira suave mientras está quieta.
- [X] Fuera del modo TV, la cámara se comporta como antes.
- [X] Con `prefers-reduced-motion`, no hay giro ni barra de tiempo animada.
- [X] Con el modo TV activo, la pantalla del equipo no se apaga por inactividad, en un navegador con Wake Lock.
- [X] En un navegador sin Wake Lock, el modo TV funciona igual y no aparece ningún error.
- [X] El manual tiene el bloque **Dejar el Mirador en un televisor**, nombra **Modo TV**, **Pausar**, **Reanudar** y **Salir del modo TV**, y hay una línea en **Sin publicar**.
- [X] El README del manual tiene la fila `5-4-mirador-modo-tv.png` en **Pendiente**.
- [X] `CLAUDE.md` tiene el párrafo del modo TV.

---

## Decisiones

- **Sí:** el recorrido cambia la selección y la escena hace el resto con `focusCamera`. No hace falta una API de cámara nueva.
- **No:** mover la cámara desde React con posiciones propias. Duplicaría lo que `focusCamera` ya sabe.
- **Sí:** paradas sólo a nivel cliente. Cada lote seleccionado es un `GET /pesajes/byLote/:loteId`, y un televisor encendido todo el día sumaría decenas por hora.
- **Sí:** sólo clientes con lotes **En pesaje** o **Por aprobar**. Decisión del usuario. Un cliente con sólo finalizados no tiene nada que mirar.
- **Sí:** la única alerta es un pesaje fuera de rango. Decisión del usuario. Es lo único que pide atención inmediata, y el resto ya se ve en la actividad.
- **No:** alertar por lote rechazado. El lote ya salió de la escena y la cámara no tendría a dónde ir.
- **No:** alertar cuando un lote pasa a **Por aprobar**. Interrumpe demasiado.
- **Sí:** una alerta por foto, la del pesaje de mayor id. Una foto con seis pesajes malos no puede secuestrar la pantalla un minuto y medio.
- **Sí:** la alerta selecciona el pesaje, no sólo el lote. El `WeighingPanel` muestra el peso, cuánto se alejó del ideal y el operario, que es lo que el supervisor necesita.
- **Sí:** 10 s de planta, 15 s por cliente, 12 s por alerta y 90 s para retomar. Propuestos y aceptados por el usuario.
- **Sí:** el recorrido se pausa con click, rueda o tecla, no con mover el mouse. Sin esto, si un supervisor se acerca al televisor y elige un lote, el recorrido le cambia la pantalla mientras lee. Mover el mouse sin querer no debería pausarlo.
- **Sí:** dos pausas distintas. La automática se retoma sola; la manual no. Quien aprieta **Pausar** está pidiendo que se quede quieto.
- **Sí:** el modo TV es pantalla completa más recorrido, en un solo botón. Salir de la pantalla completa termina el recorrido, así que no hay un recorrido "huérfano" en una ventana chica.
- **No:** recorrido sin pantalla completa. Un recorrido en la ventana del portal pelearía con el usuario que está trabajando en esa pestaña.
- **Sí:** el botón sólo con el panel lateral. El modo es para un televisor, y en el teléfono la hoja inferior taparía media escena.
- **Sí:** giro suave en cada parada. Decisión del usuario. Un televisor con la imagen quieta parece colgado.
- **Sí:** el giro se suma al `theta` pintado y no a `goal.theta`. No se acumula ni pelea con el arrastre.
- **Sí:** la barra de tiempo es una animación CSS con `key` por parada. Un estado que avanzara en cada frame re-renderizaría la vista entera.
- **Sí:** Wake Lock. Sin él, el televisor entra en reposo a los pocos minutos y el modo no sirve para lo que se hizo.
- **No:** arranque por URL para kiosko. Decisión del usuario. Va en otro spec, junto con el problema del vencimiento de la sesión.
- **No:** persistir el modo. La pantalla completa no sobrevive a una recarga, así que el recorrido tampoco.
- **No:** un permiso propio. Quien ve el Mirador (`VER-MIRADOR-3D`) ve lo mismo en el modo TV.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La sesión vence con el televisor encendido y el Mirador cae en `/login` | `POST /auth/refresh` todavía no existe en el backend (ver CLAUDE.md, cliente HTTP). Se acepta en este spec. El arranque en kiosko, que es donde más pesa, queda para otro spec que dependa del refresh. |
| El pesaje de la alerta está en un lote que no entró en su casilla (`slots.overflow`) | El lote no tiene figura y `focusCamera` cae al cliente. El panel muestra igual el `WeighingPanel`. Se acepta. |
| El `GET /pesajes/byLote/:loteId` de una alerta falla | Lo cubre el `ErrorBoundary` de `LotWeighingsLoader`, como hoy. A los 12 s, el recorrido sigue al cliente siguiente. |
| Una tecla de navegación del sistema (volumen, brillo) llega como `keydown` y pausa el recorrido | Se retoma solo a los 90 s. Se acepta. |
| El televisor no tiene Chrome ni Edge, y no hay Fullscreen API | El botón **Modo TV** no aparece. El manual recomienda Chrome o Edge. |
| El navegador rechaza el Wake Lock (ahorro de batería, política del equipo) | Se ignora en silencio y la pantalla puede apagarse. El manual lo menciona. |
| Muchos clientes activos alargan la vuelta | Con 20 clientes, la vuelta dura unos 5 min. Se acepta: los tiempos configurables están fuera de alcance. |

---

## Lo que **no** entra en este spec

- Arranque por URL para televisores en kiosko.
- Colorear por calidad o mostrar sólo las excepciones.
- Alertas por rechazo o por paso a **Por aprobar**.
- Visitar clientes con sólo lotes finalizados, o recorrer los lotes de cada cliente.
- Esconder el cursor, tiempos configurables o un permiso propio.

Cada uno de estos, si hace falta, va en su propio spec.
