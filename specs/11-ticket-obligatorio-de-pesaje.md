# SPEC 11 — Ticket obligatorio después de cada pesaje

> **Estado:** Approved
> **Depende de:** SPEC 05
> **Fecha:** 2026-09-22
> **Objetivo:** Después de cada `POST /pesajes` exitoso, abrir un modal bloqueante "Pesaje registrado exitosamente" cuyo único camino de salida es imprimir el ticket con `useDownloadEtiqueta`.

---

## Por qué existe este spec

Hoy el pesaje se guarda y la etiqueta nunca se imprime desde `/control-calidad`:

- `_portal.control-calidad.tsx:101` pasa `onImprimirEtiqueta={() => console.log('Vamos a imprimir')}`. El botón existe en la card desde el primer día y sigue escribiendo en la consola.
- `useDownloadEtiqueta` ya funciona y está en producción, pero **sólo** desde el menú de acciones del historial (`PesajeRowActions.tsx:56`). Es decir: la etiqueta se imprime desde una pantalla a la que el operario no va mientras pesa.
- `usePesajes.guardarPesaje` devuelve un `boolean` y descarta el `pesaje` de la respuesta. El `id` que la etiqueta necesita llega del backend en cada guardado y hoy se tira.
- SPEC 05 dejó "Imprimir Etiqueta" explícitamente fuera de alcance, anotando que el `id` del pesaje creado lo iba a necesitar. Este spec es ese pendiente.

El bulto sin etiqueta es un bulto que después nadie identifica en planta. Por eso la impresión no es una acción opcional al costado del flujo: es el paso que cierra el pesaje.

---

## Alcance

**Dentro:**

- Componente nuevo `src/presentation/components/control-calidad/PrintTicketDialog.tsx`: el modal bloqueante de éxito, con "Imprimir ticket" como única acción.
- `usePesajes.guardarPesaje` pasa a devolver `PesajeCreado | null` en vez de `boolean`.
- `useDownloadEtiqueta.descargarEtiqueta` angosta su parámetro a `{ id: number }` y pasa a devolver `Promise<boolean>`.
- `useControlCalidad` guarda el pesaje recién creado, cuenta los fallos de impresión y expone el bloque `impresion`.
- `mostrarBloqueo` suma una condición: el `BloqueoCriticoDialog` no puede aparecer con el modal del ticket abierto.
- Se borra el botón "Imprimir Etiqueta" de `MonitoreoBasculaCard`, su prop `onImprimirEtiqueta` y el `console.log` de la ruta.
- Montaje del `PrintTicketDialog` en `src/routes/(portal)/_portal.control-calidad.tsx`.
- Salida de emergencia "Continuar sin imprimir", visible **sólo** después de dos intentos fallidos de impresión.
- Una sección corta en `CLAUDE.md` sobre el ticket obligatorio.
- **Enmienda del 2026-09-22 (ver Decisiones):** el ticket sale por el **diálogo de impresión del navegador**, no por la descarga del archivo. Entran con ella tres piezas nuevas — el helper `src/presentation/helpers/file/printUrl.ts`, el hook `src/presentation/hooks/pesajes/usePrintEtiqueta.tsx` y el módulo compartido `src/presentation/hooks/pesajes/etiquetaPesaje.ts` con el endpoint y los tipos de la etiqueta.

**Fuera de alcance (para specs futuros):**

- **Impresión directa a una impresora de etiquetas** (ZPL, driver, servicio local). El selector de impresora del navegador sí entra; elegir la impresora por el operario y mandar el trabajo lo hace el sistema operativo.
- **Confirmar que el papel salió.** El navegador no distingue entre imprimir y cancelar, y el front no lo va a inventar.
- **Reimprimir desde `/control-calidad`.** Una vez cerrado el modal, la reimpresión sigue saliendo del historial (`PesajeRowActions`).
- **Registrar en el backend que la etiqueta se imprimió.** No hay endpoint ni campo para eso, así que un "Continuar sin imprimir" no deja rastro fuera de la pantalla.
- **Cola de impresión o reintento automático.** Cada intento es un click del operario.
- **Cambiar el contenido del PDF** o el endpoint `/reportes/pesajes/:id/etiqueta/pdf`.
- **Tocar el historial de pesajes**, `PesajeRowActions`, `RejectPesajeDialog` o la inspección por lote.
- **Tests de vitest.** Ninguno en este spec (ver Decisiones).

---

## Modelo de datos

No aparece ninguna estructura nueva ni nada persistido. Se reusa `PesajeCreado` de SPEC 05 (`src/presentation/types/pesajes/pesajes.types.ts`) y cambian dos firmas y dos estados en memoria.

### Firmas que cambian

```ts
// usePesajes.tsx — antes: Promise<boolean>
guardarPesaje: (pesoBruto: number, tara: number) => Promise<PesajeCreado | null>

// useDownloadEtiqueta.tsx — antes: (pesaje: PesajeData) => Promise<void>
descargarEtiqueta: (pesaje: EtiquetaDePesaje) => Promise<boolean>
```

```ts
/** Lo único que la etiqueta necesita del pesaje. */
interface EtiquetaDePesaje {
    id: number
}
```

`PesajeData` satisface `EtiquetaDePesaje`, así que `PesajeRowActions` sigue compilando sin cambios.

### Lo que imprime (enmienda)

`etiquetaPesaje.ts` es el único lugar que arma la URL del PDF, y lo comparten los dos hooks:

```ts
export interface EtiquetaDePesaje { id: number }
export interface EtiquetaVariables { pesajeId: number }
export const endpointEtiquetaPdf = ({ pesajeId }: EtiquetaVariables) =>
    `/reportes/pesajes/${pesajeId}/etiqueta/pdf`
```

```ts
// printUrl.ts — resuelve cuando el diálogo de impresión se cerró; rechaza si no se pudo abrir.
printUrl: (url: string) => Promise<void>

// usePrintEtiqueta.tsx
imprimirEtiqueta: (pesaje: EtiquetaDePesaje) => Promise<boolean>
/** Cubre las dos fases: pedir el PDF y tener el diálogo abierto. */
imprimiendo: boolean
```

`useDownloadEtiqueta` no cambia de comportamiento: sigue descargando y sigue siendo lo que usa el historial. `/control-calidad` pasa a usar `usePrintEtiqueta` y **no** descarga ningún archivo.

### Estado nuevo en `useControlCalidad`

```ts
/** El pesaje que espera su ticket. Mientras no sea `null`, el modal está abierto. */
const [pesajeRegistrado, setPesajeRegistrado] = useState<PesajeCreado | null>(null)

/** Descargas fallidas del ticket actual. Con 2 aparece "Continuar sin imprimir". */
const [fallosDeImpresion, setFallosDeImpresion] = useState<number>(0)
```

```ts
/** Los fallos que habilitan la salida de emergencia. */
const FALLOS_PARA_OMITIR = 2
```

### Lo que expone el hook

```ts
impresion: {
    /** `null` con el modal cerrado; el pesaje recién creado con el modal abierto. */
    pesaje: PesajeCreado | null
    /** Hay una descarga del PDF en vuelo. */
    imprimiendo: boolean
    /** Ya hubo al menos un fallo: el botón dice "Reintentar impresión". */
    fallo: boolean
    /** Se alcanzó `FALLOS_PARA_OMITIR`: se muestra "Continuar sin imprimir". */
    puedeOmitir: boolean
    imprimir: () => void
    omitir: () => void
}
```

---

## Plan de implementación

Cada paso deja el proyecto compilando.

1. **Modificar `src/presentation/hooks/pesajes/useDownloadEtiqueta.tsx`.** Dos cambios acotados: la interfaz `EtiquetaDePesaje { id: number }` reemplaza a `PesajeData` como parámetro de `descargarEtiqueta` (se borra el import del tipo), y la función devuelve `Promise<boolean>` — `true` después del `downloadUrl`, `false` en el `catch`, que sigue vacío a propósito porque el toast rojo ya lo dispara `useExecutePdfMutation`. El `toast.loading`, el `toast.dismiss` y el nombre del archivo quedan igual.
   Verificación: `npx tsc --noEmit` pasa, `PesajeRowActions` incluido.

2. **Modificar `src/presentation/hooks/pesajes/usePesajes.tsx`.** `guardarPesaje` devuelve `PesajeCreado | null`: `.then(({ pesaje }) => pesaje, () => null)`. El `onSuccess` con `toast.success(msg)` y la invalidación de `['lotes', 'cliente', lote_id]` no se tocan. El caso "sin lote" pasa a devolver `Promise.resolve(null)`.
   Verificación: `npx tsc --noEmit` marca sólo `useControlCalidad`, que es el paso siguiente.

3. **Modificar `src/presentation/hooks/bascula/useControlCalidad.tsx`.** Cinco cambios; la báscula, el selector y los parámetros no se tocan:
   - Llamar a `useDownloadEtiqueta()` y declarar `pesajeRegistrado` y `fallosDeImpresion`.
   - `confirmarTara`: `const creado = await pesajes.guardarPesaje(...)`; si es `null`, se sale como hoy. Si no, `setPesajeRegistrado(creado)`, `setFallosDeImpresion(0)` y después lo que ya hacía —`scale.reiniciarPesaje()`, `setTaraAbierta(false)`, `setAutorizado(false)`—.
   - `imprimirTicket()`: sin pesaje o con una descarga en vuelo no hace nada; si no, `descargarEtiqueta({ id: pesajeRegistrado.id })` y, con `true`, `setPesajeRegistrado(null)`; con `false`, `setFallosDeImpresion((n) => n + 1)`.
   - `omitirImpresion()`: si `fallosDeImpresion < FALLOS_PARA_OMITIR` no hace nada; si no, `setPesajeRegistrado(null)`.
   - El `useEffect` de `mostrarBloqueo` agrega `pesajeRegistrado === null` a la condición: con el modal abierto la báscula sigue leyendo, y un producto que no se retiró puede reestabilizar en 5 s y disparar el bloqueo crítico por encima del ticket.
   El hook expone el bloque `impresion` del modelo de datos; `fallo` es `fallosDeImpresion > 0` y `puedeOmitir` es `fallosDeImpresion >= FALLOS_PARA_OMITIR`.
   Verificación: `npx tsc --noEmit` pasa.

4. **Crear `src/presentation/components/control-calidad/PrintTicketDialog.tsx`.** Sobre `CustomDialog`, `size="sm"`:
   - `open={pesaje !== null}` y `onOpenChange` vacío: Esc y el click afuera no cierran. `showCloseButton={false}`, así que tampoco hay X.
   - `title="Pesaje registrado exitosamente"`, sin `description`.
   - El cuerpo es `null` mientras no haya fallos; con `fallo` en `true`, una sola línea: "No se pudo descargar la etiqueta. Reintentá la impresión.".
   - Pie: `CustomButton` primario con `isLoading={imprimiendo}`, que dice "Imprimir ticket", "Imprimiendo…" o "Reintentar impresión" según el estado; y, sólo con `puedeOmitir`, un `CustomButton` secundario "Continuar sin imprimir", deshabilitado mientras `imprimiendo`.
   Verificación: montado con un pesaje en duro, el modal no se cierra con Esc, ni con click afuera, ni tiene X.

5. **Modificar `src/presentation/views/control-calidad/MonitoreoBasculaCard.tsx`.** Se borra el `CustomButton` "Imprimir Etiqueta" con su condición y su ícono, la prop `onImprimirEtiqueta` de las dos interfaces, y los parámetros de `PanelAcciones` que quedan sin uso (`isStabilizing`, `pesoActual`, `requiereReajuste`). `ContenidoEstado` y el botón "Guardar en Base de Datos" quedan como están.
   Verificación: `npx tsc --noEmit` pasa y la card sigue viéndose igual salvo por el botón que ya no está.

6. **Modificar `src/routes/(portal)/_portal.control-calidad.tsx`.** Se saca `onImprimirEtiqueta={() => console.log('Vamos a imprimir')}` del `MonitoreoBasculaCard`, se toma `impresion` del retorno de `useControlCalidad` y se monta el `<PrintTicketDialog>` junto a los otros diálogos de la pantalla.
   Verificación manual: el flujo completo contra el backend.

7. **Actualizar `CLAUDE.md`.** Una sección corta dentro de Báscula: que todo `POST /pesajes` exitoso abre el modal bloqueante, que la única salida es imprimir, que la salida de emergencia aparece recién con dos fallos, y que `descargarEtiqueta` pide sólo un `{ id }`.

8. **Enmienda: el ticket sale por el diálogo de impresión.** Seis cambios, en este orden:
   - **Crear `src/presentation/hooks/pesajes/etiquetaPesaje.ts`** con `EtiquetaDePesaje`, `EtiquetaVariables` y `endpointEtiquetaPdf`. `useDownloadEtiqueta` pasa a importarlos en vez de declararlos: la URL del reporte queda en un solo archivo.
   - **Crear `src/presentation/helpers/file/printUrl.ts`**, hermano de `downloadUrl`. Monta un iframe oculto con la object URL, y al cargar llama a `contentWindow.print()`. Resuelve con **lo primero que ocurra** entre el `afterprint` de cualquiera de las dos ventanas y el foco volviendo a la página, y recién ahí saca el iframe del DOM: quitarlo antes cancela la impresión. Rechaza si no hay `contentWindow` o si `print()` tira. El foco se ignora durante los primeros 700 ms (`GRACIA_DE_FOCO_MS`), que es el rebote de abrir el diálogo.
   - **Crear `src/presentation/hooks/pesajes/usePrintEtiqueta.tsx`.** Mismo `useExecutePdfMutation` con `method: 'GET'` sobre `endpointEtiquetaPdf`; `imprimirEtiqueta(pesaje)` pide el PDF y se lo pasa a `printUrl`, devolviendo `true` si el diálogo llegó a abrirse y cerrarse, `false` si falló en cualquiera de las dos fases. El `toast.loading` acompaña sólo la generación del PDF. **No hay toast de éxito**: nadie puede afirmar que el papel salió.
   - **Modificar `useControlCalidad`**: `usePrintEtiqueta()` en lugar de `useDownloadEtiqueta()`, y `imprimirTicket` llama a `imprimirEtiqueta`. El resto —el conteo de fallos, `FALLOS_PARA_OMITIR`, la guarda del bloqueo— no cambia.
   - **Modificar `PrintTicketDialog`**: el botón dice "Abriendo impresión…" mientras `imprimiendo`, y la línea del fallo pasa a "No se pudo abrir la impresión de la etiqueta. Reintentá."
   - **Actualizar `CLAUDE.md`**: que el ticket sale por el diálogo del navegador, que el modal cierra al volver de él sin poder confirmar el papel, y que la descarga queda sólo para el historial.
   Verificación: `npx tsc --noEmit` pasa y el recorrido manual de los criterios de impresión.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo, sin tests nuevos ni tests rotos.
- [ ] Al confirmar la tara con un guardado exitoso aparece el modal con el título "Pesaje registrado exitosamente".
- [ ] El toast verde con el `msg` del servidor sigue saliendo, además del modal.
- [ ] El modal no tiene X, no se cierra con Esc y no se cierra con un click fuera.
- [ ] El modal muestra el título y el botón "Imprimir ticket", y ningún dato del pesaje.
- [ ] "Imprimir ticket" pide `GET /reportes/pesajes/{id}/etiqueta/pdf` con el `id` que devolvió el `POST /pesajes` (verificable en la pestaña Network).
- [ ] Al tocar "Imprimir ticket" aparece el **diálogo de impresión del navegador**, con el selector de impresora y la vista previa de la etiqueta.
- [ ] Al cerrarse ese diálogo —haya impreso o cancelado— el modal se cierra solo.
- [ ] El PDF **no** queda en la carpeta de Descargas: `/control-calidad` imprime, no descarga.
- [ ] Mientras el PDF está en vuelo y mientras el diálogo está abierto, el botón muestra el spinner y un segundo click no dispara una segunda petición.
- [ ] Con el servicio de reportes apagado, sale el toast rojo, el modal **no** se cierra y el botón pasa a decir "Reintentar impresión".
- [ ] El menú de acciones del historial sigue **descargando** el PDF, sin abrir ningún diálogo de impresión.
- [ ] Después del primer fallo **no** hay ningún botón para salir del modal.
- [ ] Después del segundo fallo aparece "Continuar sin imprimir", y al tocarlo el modal se cierra.
- [ ] Un pesaje nuevo después de un fallo arranca el contador otra vez: el primer fallo del pesaje siguiente no muestra "Continuar sin imprimir".
- [ ] Tras cerrar el modal —por impresión o por omisión— la pantalla está lista para el siguiente bulto: el peso se reinició y el dialog de tara está cerrado.
- [ ] Con un guardado fallido no aparece ningún modal: sigue el comportamiento de SPEC 05 (dialog de tara abierto y toast rojo).
- [ ] Con el modal abierto y el producto todavía sobre la plataforma, el `BloqueoCriticoDialog` **no** aparece por encima del ticket.
- [ ] El botón "Imprimir Etiqueta" ya no está en `MonitoreoBasculaCard`, y en la ruta no queda ningún `console.log`.
- [ ] El menú de acciones del historial sigue descargando la etiqueta igual que antes.
- [ ] El modal se ve correctamente en modo claro y oscuro.
- [ ] `CLAUDE.md` documenta el ticket obligatorio.

---

## Decisiones

- **Sí:** el modal es bloqueante y su única salida normal es imprimir. Decisión del usuario: el bulto sin etiqueta no se identifica después en planta, y un modal que se puede cerrar con la X se cierra con la X. Sin cancelar, sin Esc y sin click afuera.
- **Sí:** aun así existe una salida de emergencia, y aparece recién con **dos** fallos de descarga. Decisión del usuario. Si el servicio de reportes se cae, un modal sin salida frena la planta entera con el producto sobre la plataforma; exigir un reintento antes evita que un timeout suelto enseñe el atajo.
- **No:** confirmación extra al omitir. Con dos fallos encima, un segundo diálogo sólo agrega clicks a alguien que ya está peleando con la impresora.
- **Sí:** el contador de fallos se reinicia con cada pesaje. La salida de emergencia es por ticket, no por sesión: que la etiqueta anterior haya fallado dos veces no debería habilitar el atajo en el bulto siguiente.
- **Sí:** el modal muestra sólo el título y el botón. Decisión del usuario. El `id` y el `peso_neto` que devuelve el backend no se pintan: el operario acaba de ver el peso en la card y lo que necesita ahora es un click, no una lectura.
- **Sí:** el toast verde con el `msg` del servidor se mantiene además del modal. Decisión del usuario. El toast es la confirmación que ya existe para todos los guardados y es lo que queda en pantalla después de cerrar el ticket.
- **Sí:** con la descarga exitosa el modal se cierra solo. Un "Listo" agregaría un click por bulto, y el operario pesa bulto tras bulto sin salir de la pantalla.
- **No:** reimprimir desde el modal. Si el papel salió mal, la reimpresión ya existe en el historial del lote, con el pesaje buscado por su número.
- **Sí:** "imprimir" abre el diálogo de impresión del navegador, con su selector de impresora. **Enmienda del 2026-09-22, decisión del usuario durante la implementación.** El spec se aprobó con la descarga del PDF —el comportamiento que `useDownloadEtiqueta` ya tenía— y eso dejaba un paso manual en el medio: bajar el archivo, abrirlo y recién ahí imprimir. En un pesaje bulto tras bulto, ese paso es justamente el que se saltea. El costo está anotado abajo: el navegador no avisa si el operario imprimió o canceló.
- **Sí:** el modal se cierra cuando el diálogo de impresión se cierra, haya impreso o cancelado. Decisión del usuario. `afterprint` dispara igual en los dos casos y no hay forma de distinguirlos desde el front; lo que el modal garantiza es que **el diálogo se abrió**, y de ahí en más el papel depende del operario y de la impresora, como en cualquier sistema.
- **No:** preguntar "¿salió el ticket?" al volver del diálogo. Es un click más en cada bulto para una respuesta que nadie verifica, y el operario que quiere seguir pesando la contesta que sí sin mirar.
- **No:** descargar el PDF además de imprimirlo. Decisión del usuario. Pesar 200 bultos dejaría 200 archivos que nadie abre, y el respaldo real es el historial, donde la etiqueta se vuelve a generar cuando haga falta.
- **Sí:** `useDownloadEtiqueta` queda intacto y nace `usePrintEtiqueta` al lado. El historial descarga y `/control-calidad` imprime: son dos gestos distintos sobre el mismo PDF. Tocar el hook del historial estaba fuera de alcance y además lo dejaría haciendo dos cosas.
- **Sí:** `etiquetaPesaje.ts` con el endpoint compartido. Dos hooks contra el mismo reporte no pueden tener cada uno su copia de la URL.
- **No:** imprimir con una ventana nueva (`window.open` + `print()`). El bloqueador de pop-ups la corta, y deja una pestaña abierta por bulto.
- **Sí:** `descargarEtiqueta` angosta su parámetro a `{ id: number }`. Del `PesajeData` completo sólo usaba el `id`, y el `POST /pesajes` devuelve un `PesajeCreado`, que no es un `PesajeData`. Pedir lo mínimo hace que los dos llamadores entren sin inventar campos.
- **No:** que el modal arme un `PesajeData` de relleno con los campos que le faltan. Serían datos falsos viajando por el front para satisfacer un tipo que no los necesita.
- **No:** una segunda función `descargarEtiquetaPorId`. Dos puertas a la misma descarga, y la vieja quedaría pidiendo un objeto entero para leerle una propiedad.
- **Sí:** `descargarEtiqueta` devuelve `boolean` y nunca relanza. Es la misma jugada que `guardarPesaje` en SPEC 05: el modal necesita saber si contar un fallo, y el toast rojo del error ya lo pone `useExecutePdfMutation`.
- **Sí:** `guardarPesaje` devuelve el `PesajeCreado` en vez de un `boolean`. El `id` del pesaje es justamente lo que la etiqueta necesita, y `null` sigue significando lo mismo que el `false` de antes.
- **Sí:** el estado del modal vive en `useControlCalidad` y no en la ruta. Es el hook de dominio que ya gobierna la tara y el bloqueo; la ruta sólo compone.
- **Sí:** `mostrarBloqueo` exige además `pesajeRegistrado === null`. Después de guardar, el producto puede seguir sobre la plataforma: la báscula reestabiliza en 5 s y el bloqueo crítico se dispararía encima del ticket, sobre un pesaje que ya está guardado.
- **Sí:** se borra el botón "Imprimir Etiqueta" de la card. Sin pesaje creado no hay `id` que imprimir, y desde este spec cada pesaje imprime su ticket en el momento. Un botón que sólo servía para el `console.log` no sobrevive al spec que hace el trabajo de verdad.
- **Sí:** identificadores nuevos en inglés (`PrintTicketDialog`), texto de UI y comentarios en español, como manda `CLAUDE.md`.
- **No:** tests de vitest. Se mantiene la línea de SPEC 05 y SPEC 10: la verificación es `npx tsc --noEmit`, la suite existente en verde y la lista manual de arriba.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El servicio de reportes se cae y cada pesaje queda con un modal que hay que fallar dos veces antes de poder cerrarlo. | Es el costo asumido de que el ticket sea obligatorio. Dos clicks por bulto mientras dure la caída, y el pesaje ya está guardado en la base: lo único que falta es el papel. |
| El operario aprende que con dos fallos el modal se cierra y usa "Continuar sin imprimir" como atajo, dejando bultos sin etiqueta. | La salida aparece recién después de dos descargas fallidas de verdad: no se puede llegar a ella sin que el servidor haya rechazado el PDF dos veces. El front no puede hacer más; registrar la omisión necesita un campo en el backend y está fuera de alcance. |
| El modal se cierra al volver del diálogo de impresión, y el operario pudo haber cancelado: el bulto sale sin etiqueta y la pantalla ya siguió. | Asumido y decidido: el navegador no distingue imprimir de cancelar. Cancelar exige una acción deliberada sobre un diálogo que se abrió solo, y la reimpresión vive en el historial del lote. |
| **`afterprint` no llega nunca con un PDF**, y el modal queda colgado en "Abriendo impresión…" con el botón en spinner. Comprobado en Chrome durante la implementación: el evento se queda en el visor interno del navegador y no sube ni a la ventana del iframe ni a la de la página. Con "Guardar como PDF" es peor, porque encadena el diálogo nativo de guardado. | El cierre no depende de un solo evento: resuelve lo primero que ocurra entre el `afterprint` de las dos ventanas y **el foco volviendo a la página**, que es lo que siempre pasa al cerrarse el diálogo. Los primeros 700 ms de foco se ignoran, que son el rebote de abrirlo. |
| Imprimir un PDF dentro de un iframe oculto es terreno con historia: hubo versiones de navegador donde el visor interno ignoraba el `print()`. | Es la misma técnica que usa `print-js` y funciona en Chrome/Edge de escritorio, que son los únicos navegadores donde la báscula existe. Si `print()` tira, cuenta como fallo y el modal ofrece reintentar, no se cierra en silencio. |
| El modal bloqueante tapa el `BloqueoCriticoDialog` o al revés, y el operario queda con dos diálogos encimados. | El `useEffect` de `mostrarBloqueo` suma `pesajeRegistrado === null`, con un criterio de aceptación propio. |
| Cambiar `guardarPesaje` de `boolean` a `PesajeCreado \| null` rompe un llamador silenciosamente, porque un objeto también es _truthy_. | El único llamador es `confirmarTara` en `useControlCalidad`, y el cambio de tipo lo marca `npx tsc --noEmit` en el paso 2 del plan. |
| El backend devuelve `200` con un JSON de error en vez del PDF, y se descarga una "etiqueta" que es un mensaje. | Ya lo cubre `respuesta-blob.ts`, que lanza `HttpError` ante un 2xx con `application/json`. Acá eso cuenta como fallo y el modal no se cierra. |
| El operario se va de `/control-calidad` con el modal abierto. | La navegación está bloqueada por el modal salvo desde el Sidebar. Si se va igual, el pesaje ya está guardado y la etiqueta se reimprime desde el historial. |

---

## Lo que **no** entra en este spec

- Imprimir directo a una impresora de etiquetas (ZPL, driver o servicio local). El diálogo del navegador sí entra; elegir la impresora y mandar el trabajo es del sistema operativo.
- Confirmar que el papel salió: el navegador no distingue imprimir de cancelar.
- Reimprimir el ticket desde `/control-calidad` una vez cerrado el modal.
- Registrar en el backend que la etiqueta se imprimió o se omitió.
- Cola de impresión, reintento automático o impresión offline.
- Cambiar el PDF o el endpoint `/reportes/pesajes/:id/etiqueta/pdf`.
- Tocar el historial de pesajes, `PesajeRowActions` o la inspección por lote.
- Tests de vitest.

Cada uno de ellos, si se hace, va en su propio spec.
