# SPEC 22 — Observaciones en el diálogo de tara

> **Estado:** Approved
> **Depende de:** SPEC 05 (guardar pesaje), SPEC 16 (PIN de supervisor contra el backend), SPEC 44 del backend (`core-control-calidad-agro-backend/specs/44-observaciones-del-pesaje.md`), implementado en la rama `spec-44-observaciones-del-pesaje` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-19
> **Objetivo:** Agregar a `TaraPesajeDialog`, justo debajo del input **Tara**, un campo opcional **Observaciones** que viaja como `observaciones` en `POST /pesajes`.

---

## Por qué existe este spec

El backend agregó a `POST /pesajes` un campo `observaciones` opcional (SPEC 44 de allá): una nota de texto libre, de hasta 500 caracteres, donde el operador anota lo que su planta mida ("Brix 12, pulpa 8 °C"). Es la salida intermedia a modelar mediciones estructuradas, que se descartó.

Hoy el front no tiene dónde escribirla, así que el dato nunca se llena. El diálogo **Tara del envase** es la única puerta al `POST /pesajes`, así que el campo va ahí.

---

## Alcance

**Entra:**

- `observaciones` opcional en `createTaraSchema`.
- En `TaraPesajeDialog`, un `ControlledInput` **Observaciones** justo debajo del input **Tara**.
- `observaciones` viaja desde el diálogo hasta el cuerpo de `POST /pesajes`: `onConfirm` → `useControlCalidad.confirmarTara` → `usePesajes.guardarPesaje`.
- `observaciones?: string` en `CrearPesajeBody`.
- Manual de usuario: el paso del diálogo de tara, un caso en **Qué pasa si…** y una línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Mostrar las observaciones en alguna lectura: historial, inspección de pesajes o detalle por QR. El backend ya las devuelve en las tres.
- Agregar `observaciones` a los tipos de lectura de pesajes. Se agrega con el spec que las muestre.
- Imprimir las observaciones en la etiqueta del pesaje.
- Un textarea de varias líneas o un contador de caracteres.
- Validar el largo o recortar en el front.
- Editar las observaciones de un pesaje ya guardado. El backend no lo permite.

---

## Modelo de datos

### Schema

`createTaraSchema` (`src/presentation/schema/crear-pesaje/taraSchema.ts`) gana:

```ts
observaciones: z.string().optional(),
```

- Sin `trim`, sin `max` y sin `transform`. Decisión del usuario.
- El backend recorta y responde **400** `Las observaciones no pueden superar los 500 caracteres` si se pasa. Ese 400 sale como toast rojo por el `onError` que `usePesajes` ya tiene, y el diálogo queda abierto con lo escrito.
- `TaraSchema` gana `observaciones?: string` solo, por `z.infer`.

### Cuerpo

`CrearPesajeBody` (`src/presentation/types/pesajes/pesajes.types.ts`) gana:

```ts
/** SPEC 44 del backend. Nota libre del operador; opcional. */
observaciones?: string
```

`usePesajes.guardarPesaje` gana un cuarto parámetro opcional, después de `autorizacionToken`:

```ts
guardarPesaje(pesoBruto, tara, autorizacionToken?, observaciones?)
```

- La clave va en el cuerpo como `observaciones`. Si es `undefined`, `JSON.stringify` la omite y la petición no la lleva.
- `onSuccess`, `onError` y el manejo de `'autorizacion-invalida'` no cambian.

### Cadena de llamada

| Pieza | Antes | Después |
| --- | --- | --- |
| `TaraPesajeDialogProps.onConfirm` | `(tara: number) => void` | `(tara: number, observaciones?: string) => void` |
| `onSubmit` del diálogo | `onConfirm(tara)` | `onConfirm(tara, observaciones)` |
| `_portal.control-calidad.tsx` | `onConfirm={(valor) => void tara.confirmar(valor)}` | `onConfirm={(valor, observaciones) => void tara.confirmar(valor, observaciones)}` |
| `useControlCalidad.confirmarTara` | `(tara)` | `(tara, observaciones?)`, y se lo pasa a `guardarPesaje` |

### Componente

En `TaraPesajeDialog`, inmediatamente después del `ControlledInput` de `tara` y antes del `<dl>` de pesos:

```tsx
<ControlledInput
    control={form.control}
    name="observaciones"
    label="Observaciones"
    placeholder="Ej.: Brix 12, pulpa 8 °C (opcional)"
    disabled={guardando}
/>
```

- Una sola línea, `type` por defecto (`text`).
- El `useEffect` que resetea al abrir pasa a `form.reset({ tara: undefined, observaciones: undefined })`: cada pesaje arranca sin nota.
- El `useEffect` que revalida la tara cuando cambia el peso bruto no toca `observaciones`: lo escrito se conserva mientras la báscula reestabiliza.
- Si el guardado falla, el diálogo queda abierto con la tara y las observaciones escritas, igual que hoy con la tara.
- Si el backend rechaza el token del supervisor, el diálogo cierra (comportamiento de SPEC 16) y, al reabrirse, las observaciones arrancan vacías.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/schema/crear-pesaje/taraSchema.ts` | `observaciones` opcional. |
| `src/presentation/types/pesajes/pesajes.types.ts` | `observaciones?` en `CrearPesajeBody`. |
| `src/presentation/hooks/pesajes/usePesajes.tsx` | Cuarto parámetro de `guardarPesaje` y la clave en el cuerpo. |
| `src/presentation/hooks/bascula/useControlCalidad.tsx` | `confirmarTara` recibe y pasa `observaciones`. |
| `src/presentation/components/control-calidad/TaraPesajeDialog.tsx` | El input **Observaciones**, el `reset` y la firma de `onConfirm`. |
| `src/routes/(portal)/_portal.control-calidad.tsx` | El `onConfirm` pasa `observaciones`. |
| `docs/manual/MANUAL.md` | Paso del diálogo de tara, caso en **Qué pasa si…** y línea en **Sin publicar**. |

---

## Plan de implementación

1. Agregar `observaciones?` a `CrearPesajeBody` y el cuarto parámetro a `usePesajes.guardarPesaje`. Todavía nadie lo pasa. Verificación: `npx tsc --noEmit` sin errores.
2. Hacer que `useControlCalidad.confirmarTara` reciba `observaciones?` y la pase a `guardarPesaje`. Verificación: `npx tsc --noEmit` sin errores; el pesaje se guarda igual que antes.
3. Agregar `observaciones` a `createTaraSchema`, el `ControlledInput` **Observaciones** a `TaraPesajeDialog` debajo de **Tara**, el campo al `reset`, la firma nueva de `onConfirm`, y el `onConfirm` de `_portal.control-calidad.tsx`. Prueba manual:
   - Guardar un pesaje sin tocar **Observaciones**: la petición no lleva la clave.
   - Guardar otro escribiendo "Brix 12": la petición lleva `"observaciones": "Brix 12"`.
   - Escribir más de 500 caracteres: sale el toast rojo del backend y el diálogo queda abierto con lo escrito.
   - Reabrir el diálogo: **Observaciones** arranca vacío.
4. Actualizar el manual (`docs/manual/MANUAL.md`, capítulo de registrar un pesaje):
   - Un paso nuevo entre **Tara** y la revisión de pesos: "En **Observaciones**, si quiere, anote lo que mida su planta, por ejemplo el Brix o la temperatura." Renumerar los pasos siguientes.
   - En **Qué pasa si…**, un caso: las observaciones son muy largas → aviso en rojo *"Las observaciones no pueden superar los 500 caracteres"*; el diálogo sigue abierto para acortarlas.
   - Aclarar que las observaciones no se pueden corregir después de guardar.
   - Las capturas `4-1-tara.png` y `4-3-tara-autorizada.png` siguen en **Pendiente**: no hay nada que rehacer.
   - Una línea en el bloque **Sin publicar** del historial de versiones.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` no da errores.
- [ ] El diálogo **Tara del envase** tiene un campo **Observaciones** justo debajo de **Tara** y encima del recuadro de pesos.
- [ ] Guardar un pesaje sin escribir en **Observaciones** manda una petición sin la clave `observaciones`, y responde como antes.
- [ ] Guardar un pesaje con "Brix 12" en **Observaciones** manda `"observaciones": "Brix 12"`.
- [ ] Guardar un pesaje con un PIN de supervisor y observaciones manda las dos claves, `autorizacion_token` y `observaciones`.
- [ ] Un texto de más de 500 caracteres muestra el toast rojo `Las observaciones no pueden superar los 500 caracteres`, no guarda el pesaje y deja el diálogo abierto con lo escrito.
- [ ] Las observaciones no cambian el peso neto que muestra el diálogo.
- [ ] Mientras se guarda, **Observaciones** está deshabilitado.
- [ ] Si el peso cambia con el diálogo abierto, lo escrito en **Observaciones** se conserva.
- [ ] Cerrar y volver a abrir el diálogo deja **Observaciones** vacío.
- [ ] La etiqueta impresa no cambia.
- [ ] El manual nombra **Observaciones**, tiene el caso del texto largo, y hay una línea en **Sin publicar**.

---

## Decisiones

- **Sí:** el campo va justo debajo de **Tara**, dentro del diálogo. Decisión del usuario. Es la única puerta al `POST /pesajes`.
- **Sí:** `ControlledInput` de una línea. Decisión del usuario. Es el mismo control que usan los motivos de rechazo y no agrega componentes.
- **No:** un `ControlledTextarea` nuevo con contador. Se ofreció y se descartó.
- **Sí:** el schema solo con `z.string().optional()`. Decisión del usuario. El backend ya recorta y valida el largo.
- **No:** `trim`, `max(500)` ni omitir la cadena vacía en el front. Validar el largo acá ahorraría un viaje, pero el usuario prefirió dejarlo en el backend.
- **Sí:** cuarto parámetro opcional en `guardarPesaje`, después de `autorizacionToken`. No cambia ninguna llamada existente.
- **Sí:** el campo arranca vacío en cada apertura del diálogo. Cada pesaje lleva su propia nota, igual que su propia tara.
- **No:** mostrar las observaciones en las lecturas. Decisión del usuario. Va en otro spec.
- **No:** imprimirlas en la etiqueta. Decisión del usuario. Un texto libre largo puede romper el formato del ticket.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 44 del backend | El backend viejo descarta la clave `observaciones` (Zod la quita) y el pesaje se guarda sin ella, sin error. No rompe nada, pero lo escrito se pierde. Este spec se mergea después del backend. |
| El operador escribe y después borra todo | `ControlledInput` deja `''` y la petición lleva `"observaciones": ""`. Con el DTO del SPEC 44 del backend se guarda `NULL`. Si el DTO del backend no convierte el vacío, se guarda `''`. Se acepta: no rompe el pesaje. |
| Se pasa de 500 caracteres y solo se entera al guardar | El toast muestra el mensaje del backend y el diálogo conserva lo escrito para acortarlo. Se acepta en lugar de validar el largo en el front. |
| Una nota mal escrita no se corrige | El backend no permite editarla. El manual lo avisa. |

---

## Lo que **no** entra en este spec

- Mostrar las observaciones en historial, inspección de pesajes o detalle por QR.
- Imprimirlas en la etiqueta.
- Textarea, contador o validación de largo en el front.
- Editar observaciones ya guardadas.

Cada uno de estos, si hace falta, va en su propio spec.
