# SPEC 21 — Origen del lote en el formulario de creación

> **Estado:** Approved
> **Depende de:** SPEC 43 del backend (`core-control-calidad-agro-backend/specs/43-catalogo-de-origenes-de-lotes.md`), implementado en la rama `spec-43-catalogo-de-origenes-de-lotes` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-18
> **Objetivo:** Agregar a `CreateLoteForm` un selector **Origen** alimentado por `GET /catalogos/origenes`, con un botón **Crear origen** debajo que abre un mini modal contra `POST /origenes` y, al crear, invalida el catálogo de orígenes.

---

## Por qué existe este spec

El backend agregó un catálogo **global** de orígenes (fincas o proveedores) y un `origen_id` opcional en `POST /lotes` (SPEC 43 de allá). Hoy el formulario **Nuevo lote** no tiene forma de elegirlo, así que el dato nunca se llena.

El backend no tiene pantalla de administración de orígenes: no hay listado completo, ni edición, ni desactivación. Por eso el alta vive donde se usa el dato, dentro del formulario del lote. Si la finca no está en la lista, el usuario la crea ahí mismo sin perder lo que ya escribió del lote.

---

## Alcance

**Entra:**

- Hook nuevo `useGetCatalogosOrigenes` en `src/presentation/hooks/catalogos/`, con `queryKey` `['origenes']`.
- `origen_id` opcional en `createLoteSchema`.
- En `CreateLoteForm`, un `ControlledSelector` **Origen** debajo de **Producto**, con buscador.
- Debajo del selector, un botón **Crear origen** que abre un mini modal **Nuevo origen**.
- Componente nuevo `CreateOrigenDialog` con los campos **Nombre**, **Dirección** y **Teléfono**.
- Schema nuevo `createOrigenSchema` y hook nuevo `useCreateOrigen` sobre `useExecuteMutation`, contra `POST /origenes`.
- Al crear el origen: `toast.success`, invalidar `['origenes']`, cerrar el mini modal y dejar el origen nuevo elegido en el selector.
- Manual de usuario: el paso del formulario **Nuevo lote**, cómo crear un origen y una línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Mostrar el campo `origen` en las tarjetas o tablas de lotes (`LoteCard`, `FinishedLoteHighlightCard`). El backend ya lo devuelve en los cuatro listados.
- Agregar `origen` al tipo `Lote`. Se agrega con el spec que lo muestre.
- Una pantalla o tab **Orígenes** con tabla de administración. El backend no tiene `GET /origenes` ni edición ni desactivación.
- Editar o desactivar un origen.
- Hacer el origen obligatorio en el formulario.
- Un permiso propio para crear orígenes.
- Una opción para vaciar el selector una vez elegido un origen.
- Cambiar el origen de un lote ya creado.

---

## Modelo de datos

### Catálogo

`GET /catalogos/origenes` devuelve la misma forma que los otros catálogos, así que se reusa `CatalogoResponse`:

```ts
// GET /catalogos/origenes → 200
{
  ok: true,
  msg: 'Origenes obtenidos correctamente',
  data: [
    { id: 5, nombre: 'Finca El Recreo' },
    { id: 3, nombre: 'Finca San Juan' },
  ],
}
```

- Solo orígenes activos, ordenados por `nombre` desde el backend. El front no reordena.
- Es global: trae los orígenes de **todos** los clientes, no solo los del cliente del lote.
- Puede venir con `data: []`.

```ts
// src/presentation/hooks/catalogos/useGetCatalogosOrigenes.tsx
export const useGetCatalogosOrigenes = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['origenes'], '/catalogos/origenes', CATALOG_QUERY_OPTIONS)
    return { origenes: data.data }
}
```

Misma forma que `useGetCatalogosEstadosCalidad` y los otros cinco hooks de la carpeta.

### Lote

`createLoteSchema` gana:

```ts
origen_id: z.number().int().positive('El origen_id debe ser un id valido').optional(),
```

- Sin origen elegido, el campo queda `undefined` y `POST /lotes` no lo lleva. El backend guarda `NULL`.
- `useCrearLote` no cambia: ya manda el cuerpo del formulario tal cual.

### Origen

```ts
// src/presentation/schema/crear-origen/createOrigenSchema.ts
nombre:    string, trim, mínimo 1, máximo 150, obligatorio
direccion: string, trim, máximo 255, opcional
telefono:  string, trim, máximo 20, opcional
```

- Los máximos son los del backend. Validarlos acá evita un viaje que va a volver con 400.
- **`direccion` y `telefono` vacíos se mandan como `undefined`, nunca como `''`.** El backend responde 400 a una cadena vacía o a `null` en esos dos campos. El schema transforma `''` (después del `trim`) en `undefined`.

```ts
// src/presentation/types/origenes/origenes.types.ts
export interface CreateOrigenResponse {
    ok: boolean
    msg: string
    origen_id: number
}
```

```ts
// src/presentation/hooks/origenes/useCreateOrigen.tsx
useExecuteMutation<CreateOrigenResponse, CreateOrigenSchema>('/origenes', {
    onSuccess: async (data, body) => {
        toast.success(`${data.msg}: "${body.nombre}"`)
        await queryClient.invalidateQueries({ queryKey: ['origenes'] })
    },
})
```

- Sin `onError`: el toast de error sale solo (ver `CLAUDE.md`). Un nombre repetido muestra `El origen 'N' ya esta registrado`.
- El `await` importa. El origen nuevo se elige en el selector **después** de que el catálogo vuelve con él. Si se elige antes, `ControlledSelector` no encuentra la opción y muestra el placeholder.

### Componentes

`CreateLoteForm` (`src/presentation/components/lotes/CreateLoteForm.tsx`):

```tsx
<ControlledSelector
    control={control}
    name="origen_id"
    label="Origen"
    placeholder="Elegí el origen (opcional)"
    options={origenes.map(item => ({ value: item.id, label: item.nombre }))}
    valueAsNumber
    showSearch
    searchPlaceholder="Buscar origen..."
    emptyMessage="Todavía no hay orígenes"
/>
<button type="button" onClick={() => setCreateOrigenOpen(true)}>Crear origen</button>
<CreateOrigenDialog
    open={createOrigenOpen}
    onOpenChange={setCreateOrigenOpen}
    onCreated={(origenId) => setValue('origen_id', origenId, { shouldValidate: true })}
/>
```

- El botón va **siempre** visible debajo del selector, no solo cuando la lista está vacía. La finca que se busca puede faltar aunque haya otras.
- El botón es `type="button"`. Si fuera `submit`, enviaría el formulario del lote.
- El estado `createOrigenOpen` vive en `CreateLoteForm`, que es quien monta el mini modal.

`CreateOrigenDialog` (`src/presentation/components/origenes/CreateOrigenDialog.tsx`):

- Un `CustomDialog` de `size="sm"`, título **Nuevo origen**, descripción "El origen queda disponible para los lotes de todos los clientes."
- Tiene su **propio** `useForm` con `createOrigenSchema`. No usa `useFormContext`: el contexto más cercano es el del lote.
- Formulario con `id` `form-crear-origen`. Pie: **Cancelar** y **Crear origen** (**Creando...** mientras está pendiente), igual que el diálogo del lote.
- Al crear: llama `onCreated(data.origen_id)`, cierra y resetea su formulario.
- Al fallar: queda abierto con lo escrito, y el toast muestra el error.
- **El `onSubmit` de su `<form>` corta la propagación** (`event.stopPropagation()`) antes de `handleSubmit`. El diálogo se pinta en un portal, pero en React el evento `submit` sube por el árbol de componentes, no por el DOM. Sin el corte, crear un origen enviaría también el formulario del lote.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/hooks/catalogos/useGetCatalogosOrigenes.tsx` | Nuevo. |
| `src/presentation/schema/crear-lote/crearLoteSchema.ts` | `origen_id` opcional. |
| `src/presentation/types/origenes/origenes.types.ts` | Nuevo, `CreateOrigenResponse`. |
| `src/presentation/schema/crear-origen/createOrigenSchema.ts` | Nuevo, `createOrigenSchema` y `CreateOrigenSchema`. |
| `src/presentation/hooks/origenes/useCreateOrigen.tsx` | Nuevo. |
| `src/presentation/components/origenes/CreateOrigenDialog.tsx` | Nuevo. |
| `src/presentation/components/lotes/CreateLoteForm.tsx` | Selector **Origen**, botón **Crear origen** y el mini modal. |
| `docs/manual/MANUAL.md` | Paso del formulario **Nuevo lote**, cómo crear un origen y línea en **Sin publicar**. |

---

## Plan de implementación

1. Crear `useGetCatalogosOrigenes` con el código del modelo de datos. Todavía nadie lo llama. Verificación: `npx tsc --noEmit` sin errores.
2. Agregar `origen_id` opcional a `createLoteSchema`, y el `ControlledSelector` **Origen** a `CreateLoteForm`, debajo de **Producto**. Prueba manual: en **Nuevo lote**, el selector lista los orígenes del backend. Crear un lote sin elegir origen: la petición no lleva `origen_id`. Crear otro eligiendo uno: la petición lleva el id.
3. Crear `CreateOrigenResponse`, `createOrigenSchema` y `useCreateOrigen`. Todavía nadie llama al hook. Verificación: `npx tsc --noEmit` sin errores.
4. Crear `CreateOrigenDialog` y montarlo en `CreateLoteForm` con el botón **Crear origen**. Prueba manual:
   - Con el lote a medio llenar, pulsar **Crear origen**, cargar solo el nombre y pulsar **Crear origen**.
   - El mini modal cierra, sale el toast y el origen nuevo queda elegido en **Origen**.
   - Lo escrito en el lote sigue ahí y el lote **no** se envió.
   - Repetir el nombre en mayúsculas: el toast muestra el error y el mini modal queda abierto.
5. Actualizar el manual:
   - En **Crear un lote**, el paso 4 nombra **Origen** como opcional.
   - Un párrafo nuevo cuenta que si el origen no está en la lista, se pulsa **Crear origen**, se completa **Nombre** (y, si se tienen, **Dirección** y **Teléfono**), se pulsa **Crear origen** y queda elegido. Aclara que el origen queda disponible para todos los clientes y que no se puede corregir desde la aplicación.
   - La captura `4-5-crear-lote.png` sigue en **Pendiente**: todavía no se tomó, así que no hay nada que rehacer.
   - Una línea en el bloque **Sin publicar** del historial de versiones.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` no da errores.
- [ ] El formulario **Nuevo lote** tiene un selector **Origen** debajo de **Producto**, con buscador.
- [ ] El selector muestra exactamente las opciones de `GET /catalogos/origenes`, en el mismo orden.
- [ ] Sin orígenes en el backend, el selector abre y muestra "Todavía no hay orígenes".
- [ ] Crear un lote sin elegir origen funciona como antes y la petición no lleva `origen_id`.
- [ ] Crear un lote con un origen elegido manda su `origen_id` numérico.
- [ ] Debajo del selector hay un botón **Crear origen**, visible haya o no orígenes.
- [ ] Pulsar **Crear origen** abre el mini modal **Nuevo origen** encima del formulario del lote, y no envía el lote.
- [ ] El mini modal exige **Nombre**. **Dirección** y **Teléfono** se pueden dejar vacíos.
- [ ] Con **Dirección** y **Teléfono** vacíos, la petición a `POST /origenes` no lleva esas claves.
- [ ] Al crear un origen: sale un toast de éxito, el mini modal cierra, el catálogo `['origenes']` se vuelve a pedir y el origen nuevo queda elegido en **Origen**.
- [ ] Después de crear el origen, lo escrito en el formulario del lote sigue igual y el lote no se creó.
- [ ] Un nombre repetido muestra el error del backend en un toast y el mini modal queda abierto con lo escrito.
- [ ] **Cancelar** en el mini modal lo cierra sin tocar el formulario del lote.
- [ ] Cerrar el formulario del lote y volver a abrirlo deja **Origen** vacío.
- [ ] El manual nombra **Origen** y **Crear origen**, y hay una línea en **Sin publicar**.

---

## Decisiones

- **Sí:** el alta del origen dentro del formulario del lote, en un mini modal. Decisión del usuario. El backend no tiene pantalla de administración que justifique un tab.
- **No:** un tab **Orígenes** con tabla y botón de crear. El único listado del backend es `{ id, nombre }` de los activos, y no hay edición ni desactivación: la tabla tendría una columna y ninguna acción.
- **Sí:** el botón **Crear origen** siempre visible debajo del selector. La finca buscada puede faltar aunque la lista tenga otras.
- **Sí:** invalidar `['origenes']` al crear. Decisión del usuario. El catálogo tiene 10 minutos de `staleTime` y sin invalidar el origen nuevo no aparecería.
- **Sí:** dejar elegido el origen recién creado. `POST /origenes` devuelve `origen_id` justamente para esto, y quien lo crea lo hace para usarlo en este lote.
- **Sí:** `showSearch` en el selector. El catálogo es global, crece con los orígenes de todos los clientes y el backend no pagina ni busca.
- **Sí:** origen opcional, igual que en el backend. No rompe la creación de lotes de hoy.
- **No:** un permiso propio para **Crear origen**. El backend no tiene código para eso y valida solo el token. Quien ve el formulario del lote ya pasó por `CREAR-CLIENTE-LOTE-NUEVO`.
- **Sí:** `CustomDialog` `size="sm"` para el mini modal. Son tres campos.
- **Sí:** el mini modal con su propio `useForm`. Mezclarlo con el formulario del lote haría que la validación de uno bloquee al otro.
- **Sí:** `stopPropagation` en el `onSubmit` del mini modal. Es la forma más chica de que su envío no dispare el del lote.
- **No:** mover el mini modal fuera del `<form>` del lote, a la ruta. Obligaría a subir el estado y el `setValue` a `_portal.inspeccion-lotes-by-cliente.tsx`, que hoy solo compone.
- **Sí:** nombres `useCreateOrigen`, `CreateOrigenDialog` y `createOrigenSchema`. Verbo en inglés como pide `CLAUDE.md`, con el sustantivo del dominio como `useCreateDocumentoFiscal`. El hook del catálogo mantiene el prefijo `useGetCatalogos` de su carpeta.
- **No:** mostrar el origen en las tarjetas de lotes en este spec. Es otra pantalla y otro cambio de tipos.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 43 del backend | `GET /catalogos/origenes` da 404 y el formulario del lote cae en su `ErrorBoundary`: **se rompe la creación de lotes**. Este spec se mergea después del backend. |
| El `submit` del mini modal sube por el árbol de React y envía el lote | `stopPropagation` en el `onSubmit` del mini modal, y un criterio de aceptación que lo verifica. |
| `Esc` cierra los dos diálogos a la vez | La primitiva de `@base-ui/react` maneja diálogos anidados y cierra solo el de arriba. Se verifica en el paso 4. Si no, se controla en `onOpenChange`. |
| Una vez elegido un origen no hay forma de volver a "sin origen" | `ControlledSelector` no tiene opción para vaciar. Se acepta: cerrar y volver a abrir el formulario lo resetea. Una opción para vaciar es otro spec. |
| El selector muestra a cada cliente las fincas de los demás | Riesgo aceptado en el SPEC 43 del backend. Solo viaja el nombre. |
| Un origen mal escrito queda para todos y no se corrige desde la app | Se corrige a mano en la base. El manual lo avisa. |

---

## Lo que **no** entra en este spec

- Mostrar el origen en tarjetas o tablas de lotes.
- Un tab o pantalla de administración de orígenes.
- Editar, desactivar o vaciar un origen.
- Origen obligatorio.
- Un permiso para crear orígenes.

Cada uno de estos, si hace falta, va en su propio spec.
