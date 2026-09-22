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
- Salida de emergencia "Continuar sin imprimir", visible **sólo** después de dos intentos fallidos de descarga.
- Una sección corta en `CLAUDE.md` sobre el ticket obligatorio.

**Fuera de alcance (para specs futuros):**

- **Abrir el diálogo de impresión del navegador.** El hook descarga el PDF, que es lo que ya hace desde el historial; no se agrega `window.print()` ni un iframe oculto.
- **Impresión directa a una impresora de etiquetas** (ZPL, driver, servicio local).
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

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo, sin tests nuevos ni tests rotos.
- [ ] Al confirmar la tara con un guardado exitoso aparece el modal con el título "Pesaje registrado exitosamente".
- [ ] El toast verde con el `msg` del servidor sigue saliendo, además del modal.
- [ ] El modal no tiene X, no se cierra con Esc y no se cierra con un click fuera.
- [ ] El modal muestra el título y el botón "Imprimir ticket", y ningún dato del pesaje.
- [ ] "Imprimir ticket" pide `GET /reportes/pesajes/{id}/etiqueta/pdf` con el `id` que devolvió el `POST /pesajes` (verificable en la pestaña Network).
- [ ] Con la descarga exitosa el PDF baja como `etiqueta-pesaje-{id}.pdf` y el modal se cierra solo.
- [ ] Mientras el PDF está en vuelo, el botón muestra el spinner y un segundo click no dispara una segunda petición.
- [ ] Con el servicio de reportes apagado, sale el toast rojo, el modal **no** se cierra y el botón pasa a decir "Reintentar impresión".
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
- **Sí:** "imprimir" es la descarga del PDF que ya hace `useDownloadEtiqueta`. Decisión del usuario, que pidió ese hook por nombre. Abrir el diálogo de impresión del navegador exige un iframe oculto o una ventana nueva, y una impresora de etiquetas de verdad exige un canal propio: las dos cosas son su propio spec.
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
| La descarga "exitosa" cierra el modal aunque el PDF nunca llegue a la impresora: el navegador bajó el archivo y nadie lo mandó a imprimir. | Es el mismo comportamiento que el historial ya tiene en producción. La reimpresión desde `/pesajes/historial` cubre el papel perdido. Imprimir de verdad es otro spec. |
| El modal bloqueante tapa el `BloqueoCriticoDialog` o al revés, y el operario queda con dos diálogos encimados. | El `useEffect` de `mostrarBloqueo` suma `pesajeRegistrado === null`, con un criterio de aceptación propio. |
| Cambiar `guardarPesaje` de `boolean` a `PesajeCreado \| null` rompe un llamador silenciosamente, porque un objeto también es _truthy_. | El único llamador es `confirmarTara` en `useControlCalidad`, y el cambio de tipo lo marca `npx tsc --noEmit` en el paso 2 del plan. |
| El backend devuelve `200` con un JSON de error en vez del PDF, y se descarga una "etiqueta" que es un mensaje. | Ya lo cubre `respuesta-blob.ts`, que lanza `HttpError` ante un 2xx con `application/json`. Acá eso cuenta como fallo y el modal no se cierra. |
| El operario se va de `/control-calidad` con el modal abierto. | La navegación está bloqueada por el modal salvo desde el Sidebar. Si se va igual, el pesaje ya está guardado y la etiqueta se reimprime desde el historial. |

---

## Lo que **no** entra en este spec

- Abrir el diálogo de impresión del navegador o imprimir directo a una impresora de etiquetas.
- Reimprimir el ticket desde `/control-calidad` una vez cerrado el modal.
- Registrar en el backend que la etiqueta se imprimió o se omitió.
- Cola de impresión, reintento automático o impresión offline.
- Cambiar el PDF o el endpoint `/reportes/pesajes/:id/etiqueta/pdf`.
- Tocar el historial de pesajes, `PesajeRowActions` o la inspección por lote.
- Tests de vitest.

Cada uno de ellos, si se hace, va en su propio spec.
