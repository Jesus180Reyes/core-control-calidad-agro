# SPEC 18 — Selector de estado de calidad en los filtros de pesajes

> **Estado:** Approved
> **Depende de:** SPEC 40 del backend (`core-control-calidad-agro-backend/specs/40-catalogo-de-estados-de-calidad.md`), implementado en la rama `spec-40-catalogo-de-estados-de-calidad` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-14
> **Objetivo:** Consumir `GET /catalogos/estados-calidad` con un hook nuevo y cambiar el campo numérico "ID de estado de calidad" de `PesajesFiltersBar` y `HistorialFiltersBar` por un selector con los estados que devuelve el backend.

---

## Por qué existe este spec

Las dos barras de filtros de pesajes piden el estado de calidad como un número suelto: un `ControlledInput` con `type="number"`, label "ID de estado de calidad" y placeholder "Ej. 1". El operario no sabe qué id corresponde a cada estado. Además, los ids de `estados_calidad` pueden cambiar entre entornos, así que no se pueden escribir en el front.

El backend agregó `GET /catalogos/estados-calidad` (SPEC 40 de allá) para alimentar exactamente este selector.

---

## Alcance

**Entra:**

- Hook nuevo `useGetCatalogosEstadosCalidad` en `src/presentation/hooks/catalogos/`, sobre `useExecuteQuery`, con `queryKey` `['estados-calidad']`.
- En `PesajesFiltersBar` (`/inspeccion-pesajes-by-lote`), el `ControlledInput` de `estado_calidad_id` pasa a ser un `ControlledSelector`.
- En `HistorialFiltersBar` (`/historial`), el mismo cambio.
- Manual de usuario: los dos párrafos de filtros nombran el filtro **Estado de calidad**, y se agrega una línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Colorear las opciones por estado. El endpoint no devuelve `codigo` y colorear por id está prohibido (ver Métricas en `CLAUDE.md`).
- Un filtro por estado de calidad en `MetricsFilterBar`. `GET /metricas/calidad` no acepta ese param.
- Selección múltiple de estados. El backend acepta un solo `?estado_calidad_id`.
- Cambiar `filtrosPesajesSchema` o `filtrosHistorialSchema`.
- El `lote_id` de `filtrosHistorialSchema`, que no tiene campo en la barra.
- Tocar los otros campos de las barras.

---

## Modelo de datos

No hay tipos nuevos. El endpoint devuelve la misma forma que los otros catálogos, así que se reusa `CatalogoResponse` de `src/presentation/types/catalogos/catalogo_response.ts`:

```ts
// GET /catalogos/estados-calidad → 200
{
  ok: true,
  msg: 'Estados de calidad obtenidos correctamente',
  data: [
    { id: 1, nombre: 'PESO IDEAL' },
    { id: 2, nombre: 'PESO MAXIMO' },
    { id: 3, nombre: 'PESO MINIMO' },
  ],
}
```

- `data` viene ordenado por `id` desde el backend. El front no lo reordena.
- Son todas las filas de la tabla, sin filtro. El endpoint no recibe params.
- Lo puede llamar cualquier usuario autenticado. No hay permiso que consultar.

### Hook

```ts
// src/presentation/hooks/catalogos/useGetCatalogosEstadosCalidad.tsx
export const useGetCatalogosEstadosCalidad = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['estados-calidad'], '/catalogos/estados-calidad', CATALOG_QUERY_OPTIONS)
    return { estadosCalidad: data.data }
}
```

Misma forma que `useGetCatalogosOperadores` y `useGetCatalogosUnidadMedida`.

### Campo en las barras

```tsx
<ControlledSelector
    control={form.control}
    name="estado_calidad_id"
    label="Estado de calidad"
    placeholder="Todos los estados"
    valueAsNumber
    options={estadosCalidad.map((estado) => ({
        value: estado.id,
        label: estado.nombre,
    }))}
/>
```

- `valueAsNumber`, igual que el selector de **Usuario**: el form guarda el id como número y el schema lo valida con `z.coerce.number().int().positive()`, sin cambios.
- Sin `showSearch`: son tres opciones.
- La etiqueta de cada opción es el `nombre` tal cual llega (`PESO IDEAL`).
- El campo ocupa la misma celda de la grilla que el input actual.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/hooks/catalogos/useGetCatalogosEstadosCalidad.tsx` | Nuevo. |
| `src/presentation/views/inspeccion-pesajes/PesajesFiltersBar.tsx` | `ControlledInput` de `estado_calidad_id` → `ControlledSelector`. |
| `src/presentation/views/historial/HistorialFiltersBar.tsx` | El mismo cambio. Si `ControlledInput` sigue en uso por `nombre`, el import se queda. |
| `docs/manual/MANUAL.md` | Párrafos de filtros de **Pesajes registrados** y del historial, y línea en **Sin publicar**. |

---

## Plan de implementación

1. Crear `useGetCatalogosEstadosCalidad` con el código del modelo de datos. Todavía nadie lo llama. Verificación: `npx tsc --noEmit` sin errores.
2. En `PesajesFiltersBar`, llamar al hook y cambiar el `ControlledInput` de `estado_calidad_id` por el `ControlledSelector`. Quitar el import de `ControlledInput` solo si queda sin uso. Prueba manual: en `/inspeccion-pesajes-by-lote`, elegir **PESO MAXIMO**, pulsar **Buscar** y ver solo pesajes en ese estado; **Limpiar Filtros** vuelve al placeholder.
3. En `HistorialFiltersBar`, el mismo cambio. Prueba manual: lo mismo en `/historial`.
4. Actualizar `docs/manual/MANUAL.md`:
   - En **Pesajes registrados**: "Puede filtrar los pesajes por **Usuario**, por fecha (**Desde** y **Hasta**), por **Fuera de rango** o por **Estado de calidad**."
   - En el historial: agregar **Estado de calidad** a la lista de filtros.
   - Una línea en el bloque **Sin publicar** del historial de versiones.
   - Las capturas `4-6-inspeccion-pesajes.png` y `4-8-historial.png` siguen en **Pendiente**: todavía no se tomaron, así que no hay nada que rehacer.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` no da errores.
- [ ] En `/inspeccion-pesajes-by-lote`, el filtro se llama **Estado de calidad** y es un selector, no un campo numérico.
- [ ] En `/historial`, lo mismo.
- [ ] El selector muestra exactamente las opciones que devuelve `GET /catalogos/estados-calidad`, en el mismo orden.
- [ ] Sin un estado elegido, el selector muestra "Todos los estados" y la petición no lleva `estado_calidad_id`.
- [ ] Al elegir un estado y pulsar **Buscar**, la petición lleva `estado_calidad_id` con el id numérico de ese estado.
- [ ] La tabla muestra solo pesajes con ese estado de calidad.
- [ ] El badge de filtros activos cuenta el estado elegido como un filtro.
- [ ] **Limpiar Filtros** vacía el selector y quita el param de la petición.
- [ ] Las dos barras piden el catálogo con la misma `queryKey`, `['estados-calidad']`.
- [ ] Ningún archivo del front contiene los ids de estados de calidad escritos a mano.
- [ ] El manual nombra **Estado de calidad** en los dos párrafos de filtros y tiene su línea en **Sin publicar**.

---

## Decisiones

- **Sí:** un hook por catálogo, `useGetCatalogosEstadosCalidad`, igual que los otros cuatro de `hooks/catalogos/`.
- **Sí:** el nombre del hook en español, contra la regla de identificadores nuevos en inglés. Los cinco hooks de la carpeta comparten el prefijo `useGetCatalogos`, incluido `useGetCatalogosOperadores`, que es el más reciente. Romper el patrón dentro de la carpeta confunde más que lo que aporta la regla.
- **Sí:** reusar `CatalogoResponse`. El backend devuelve `{ id, nombre }`, exactamente la forma de los otros catálogos.
- **Sí:** placeholder "Todos los estados" y ninguna opción "Todos" en la lista. Es lo que hace el selector de **Usuario**: el estado vacío es el placeholder y se limpia con **Limpiar Filtros**.
- **No:** una opción `{ value: '', label: 'Todos' }` como la de **Fuera de rango**. Con `valueAsNumber`, `Number('')` es `0` y el schema lo rechaza por no ser positivo.
- **Sí:** mostrar el `nombre` tal cual (`PESO IDEAL`). Es el mismo texto que el badge de estado en las tablas.
- **No:** colores por estado. El backend decidió no devolver `codigo`, y el front colorea por `codigo`, nunca por id.
- **Sí:** cambiar las dos barras en el mismo spec. Comparten el campo, el endpoint y el problema.
- **No:** tocar los schemas. Ya validan `estado_calidad_id` como entero positivo.
- **Sí:** `CATALOG_QUERY_OPTIONS` (`hooks/catalogos/catalogQueryOptions.ts`, 10 min de `staleTime` y `gcTime`), como los otros catálogos. Dejarlo en los 5 s por defecto lo convertiría en la única excepción de la carpeta.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 40 del backend | `GET /catalogos/estados-calidad` da 404 y las dos barras caen en su `ErrorBoundary`. Este spec se mergea después del backend. |
| Se agrega a mano un estado que ningún pesaje usa | Aparece en el selector y el filtro devuelve una tabla vacía. Es correcto: el backend nunca da 400 por ese filtro. |
| La query del catálogo falla | La barra suspende y falla igual que hoy con el catálogo de usuarios o de clientes. No es un caso nuevo. |

---

## Lo que **no** entra en este spec

- Colores o íconos por estado.
- Filtro por estado en Métricas.
- Selección múltiple.
- Cambios a los schemas de filtros.
- Cambios a los otros campos de las barras.

Cada uno de estos, si hace falta, va en su propio spec.
