# SPEC 12 — Paginación de inspección de clientes e historial

> **Estado:** Approved
> **Depende de:** SPEC 08, SPEC 09, SPEC 29 del backend (`core-control-calidad-agro-backend/specs/29-paginacion-de-listados-de-clientes-e-historial.md`)
> **Fecha:** 2026-10-03
> **Objetivo:** Paginar de a 20 filas las tablas de `/inspeccion-clientes` y `/historial` con los params `pagina` y `limite` del backend, con un paginador Anterior/Siguiente que no saca la tabla de pantalla al cambiar de página.

---

## Por qué existe este spec

El SPEC 29 del backend agregó paginación **opcional** a `GET /clientes/all`, `GET /clientes` y `GET /pesajes/historial`. Hoy las dos tablas del front piden la lista completa, y el historial es la lista que más crece: un solo usuario de la base de desarrollo ya tiene 120 pesajes.

Este spec conecta esa paginación en las dos tablas. Toma cuatro decisiones que conviene tener claras antes de leer el resto.

**La primera: `/clientes` no se pagina.** Es la grilla de tarjetas donde el operador elige a qué cliente pesar. Su cartera es chica, y obligarlo a cambiar de página para encontrar un cliente frena la planta. El backend ya acepta `pagina` en esa ruta, así que paginarla después es un spec chico.

**La segunda: la paginación del backend es opt-in, y de eso depende que nada se rompa.** `useClientInspection()` alimenta **cuatro** consumidores: la tabla de `/inspeccion-clientes` y tres selectores de cliente (`HistorialFiltersBar`, `DocumentosFiscalesFiltersBar` y `CreateDocumentoFiscalForm`). Los selectores necesitan la lista **completa**. Como el backend sin `pagina` ni `limite` responde exactamente igual que antes, alcanza con que solo la tabla mande esos params.

**La tercera: el orden de columnas del `DataTable` se mantiene, y pasa a ordenar solo la página visible.** El `DataTable` ordena en el cliente. Con paginación, hacer clic en "Cliente" ordena las 20 filas que se ven, no todos los clientes. Es una decisión explícita, y su costo está en Riesgos.

**La cuarta: cambiar de página no muestra el spinner.** `useExecuteQuery` corre sobre `useSuspenseQuery`. Cada página es una `queryKey` nueva, así que sin cuidado la tabla se reemplaza por el `LoadingState` en cada clic. El cambio de página va dentro de `startTransition`: React deja la tabla anterior en pantalla, atenuada, hasta que llega la nueva.

---

## Alcance

**Dentro:**

- Tipo nuevo `Paginacion` en `src/presentation/types/shared/paginacion.types.ts`.
- `paginacion?: Paginacion` opcional en `ClientesResponse` y en `PesajesResponse`.
- Constante `TAMANO_PAGINA = 20` junto al tipo.
- `useClientInspection(filtros, pagina?)`: manda `pagina` y `limite` **solo** si recibe `pagina`, y devuelve también `paginacion`.
- `useHistorialPesajes(filtros, pagina)`: siempre paginado, y devuelve también `paginacion`.
- Componente nuevo `src/presentation/components/shared/table/PaginationBar.tsx`, con Anterior, Siguiente y el texto "Página X de Y · N clientes".
- `_portal.inspeccion-clientes.tsx` y `_portal.historial.tsx`: estado `pagina` en `useState`, con `useTransition`. Aplicar filtros vuelve a la página 1.
- `ClientInspectionView` y `HistorialPesajesTable`: reciben `pagina`, `onPageChange` e `isPending`, atenúan la tabla mientras carga y pintan el `PaginationBar` debajo.
- Actualizar la sección "Tablas" de `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- Paginar `/clientes` (`useClientes`, `ClientesView`).
- Paginar cualquier otra tabla: `useInspeccionPesajes` (`/pesajes/byLote/:loteId`), lotes y documentos fiscales. El backend no las pagina.
- Ordenamiento del lado del servidor. El backend no acepta un param de orden.
- Selector de tamaño de página. Va fijo en 20.
- Números de página, y botones de Primera y Última.
- La página en la URL (`validateSearch`).
- Tests del `PaginationBar` y de los hooks.
- Cambios en los tres selectores de cliente: siguen llamando a `useClientInspection()` sin página.
- Pasar la aplicación de filtros por `startTransition`. Filtrar sigue mostrando el spinner como hoy.

---

## Modelo de datos

### Contrato del backend (SPEC 29)

Lo que el front tiene que saber de las dos rutas:

- **Sin `pagina` ni `limite`, la respuesta es idéntica a la de antes:** `{ ok, msg, clientes }` o `{ ok, msg, pesajes }`, sin `paginacion`.
- **Con al menos uno**, el array trae solo las filas de esa página y aparece una clave hermana:

  ```ts
  paginacion: { pagina: number, limite: number, total: number, total_paginas: number }
  ```

- `limite` se topa en **100** del lado del servidor. Un valor inválido (`abc`, `0`, `-1`) se ignora y **nunca** da 400.
- Una página después de la última responde **200** con el array vacío y los `total`/`total_paginas` reales.
- Una lista vacía devuelve `total: 0` y `total_paginas: 0`.
- **No hay param de orden.** `/clientes/all` entrega `created_at ASC` y `/pesajes/historial` `created_at DESC`, y el backend no desempata por `id`.
- Los filtros siguen funcionando igual y se combinan con la paginación: `total` cuenta solo las filas filtradas.

### Tipo nuevo

`src/presentation/types/shared/paginacion.types.ts`:

```ts
export interface Paginacion {
    pagina: number
    limite: number
    total: number
    total_paginas: number
}

export const TAMANO_PAGINA = 20
```

### Tipos que cambian

```ts
// clientes.types.ts
export interface ClientesResponse {
    ok: boolean
    msg: string
    clientes: Cliente[]
    paginacion?: Paginacion   // solo cuando se pidió página
}

// pesajesResponse.ts
export interface PesajesResponse {
    ok: boolean
    msg: string
    pesajes: PesajeData[]
    paginacion?: Paginacion   // solo /pesajes/historial con página
}
```

`paginacion` es **opcional**, porque los mismos tipos los usan llamadas que no paginan: `useClientes`, los tres selectores y `useInspeccionPesajes`.

### Hooks

```ts
useClientInspection(filtros: FiltrosClientes = {}, pagina?: number)
// sin pagina  → params = filtros                                   (selectores: sin cambios)
// con pagina  → params = { ...filtros, pagina, limite: TAMANO_PAGINA }
// queryKey    → ['clientes', 'all', params]
// devuelve    → { clientes, paginacion }   // paginacion: undefined sin página

useHistorialPesajes(filtros: FiltrosHistorial, pagina: number)
// params      → { ...resto, desde, hasta, pagina, limite: TAMANO_PAGINA }
// queryKey    → ['pesajes', 'historial', params]
// devuelve    → { pesajes, paginacion }
```

`limite` viaja **explícito**, aunque el default del backend también sea 20, para que el tamaño de página dependa del front y no de un default ajeno.

La `queryKey` sigue siendo `[..., params]`, así que cada página es su propia entrada de caché. Volver a una página ya visitada sale de la caché, sin parpadeo y sin red.

### `PaginationBar`

```ts
interface PaginationBarProps {
    paginacion: Paginacion
    itemLabel: { one: string; other: string }   // { one: 'cliente', other: 'clientes' }
    onPageChange: (pagina: number) => void
    isPending?: boolean
}
```

- Texto: `Página {pagina} de {total_paginas} · {total} {one|other}`. Usa `one` cuando `total === 1`.
- **Anterior** deshabilitado si `pagina <= 1` o `isPending`. Llama a `onPageChange(pagina - 1)`.
- **Siguiente** deshabilitado si `pagina >= total_paginas` o `isPending`. Llama a `onPageChange(pagina + 1)`.
- Con `total === 0` **no se renderiza**: el estado vacío del `DataTable` ya dice que no hay filas.
- Botones con `CustomButton` `variant="secondary"` y los íconos `ChevronLeft`/`ChevronRight` de `lucide-react`. Tokens semánticos (`text-text-muted`), nada de colores crudos.

### Estado en la ruta

```ts
const [filtros, setFiltros] = useState<Filtros...>({})
const [pagina, setPagina] = useState(1)
const [isPending, startTransition] = useTransition()

const aplicarFiltros = (nuevos) => { setFiltros(nuevos); setPagina(1) }
const cambiarPagina = (p: number) => startTransition(() => setPagina(p))
```

- Aplicar filtros **siempre** vuelve a la página 1. Si no, filtrar estando en la página 5 de un resultado de 2 páginas muestra un vacío falso.
- Aplicar filtros **no** va en transición: sigue suspendiendo con el `LoadingState`, como hoy.
- La vista envuelve el `DataTable` en un `div` con `opacity-60` mientras `isPending`, con una transición de opacidad.

---

## Plan de implementación

1. **Tipos.** Crear `src/presentation/types/shared/paginacion.types.ts` con `Paginacion` y `TAMANO_PAGINA`. Sumar `paginacion?: Paginacion` a `ClientesResponse` y a `PesajesResponse`. Verificación: `npx tsc --noEmit` pasa sin tocar nada más.
2. **`PaginationBar`.** Crear `src/presentation/components/shared/table/PaginationBar.tsx` con las props, el texto y las reglas de deshabilitado de arriba. Todavía no lo usa nadie.
3. **Historial.** `useHistorialPesajes` recibe `pagina` y devuelve `paginacion`. `_portal.historial.tsx` agrega `pagina`, `useTransition` y `aplicarFiltros`, y le pasa `onApply={aplicarFiltros}` a `HistorialFiltersBar`. `HistorialPesajesTable` recibe `pagina`, `onPageChange` e `isPending`, atenúa la tabla y pinta el `PaginationBar` con `{ one: 'pesaje', other: 'pesajes' }`. Verificación manual en `/historial`: 20 filas, el texto con el total y Siguiente sin spinner.
4. **Inspección de clientes.** `useClientInspection` recibe `pagina?` y devuelve `paginacion`. `_portal.inspeccion-clientes.tsx` y `ClientInspectionView` se tocan igual que en el paso 3, con `{ one: 'cliente', other: 'clientes' }`. Verificación manual: la tabla pagina, y los selectores de cliente de `/historial` y de documentos fiscales siguen mostrando **todos** los clientes.
5. **`CLAUDE.md`.** En la sección "Tablas", reemplazar "El componente pinta todas las filas que recibe; no tiene paginación ni búsqueda" por la regla nueva. El `DataTable` sigue sin paginar; la página la tiene la ruta, la pide el hook y el `PaginationBar` la pinta. Documentar también que el orden de columna es solo de la página visible, el `startTransition` del cambio de página y que `useClientInspection()` sin página es lo que mantiene completos los selectores.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo.
- [ ] `/historial` pide `GET /pesajes/historial?pagina=1&limite=20` al entrar y muestra como máximo 20 filas.
- [ ] `/inspeccion-clientes` pide `GET /clientes/all?pagina=1&limite=20` al entrar y muestra como máximo 20 filas.
- [ ] Debajo de cada tabla se lee "Página X de Y · N pesajes" o "· N clientes", con X, Y y N tomados de `paginacion`.
- [ ] Con `total === 1` el texto dice "1 pesaje" o "1 cliente", en singular.
- [ ] En la página 1, Anterior está deshabilitado. En la última, Siguiente está deshabilitado.
- [ ] Hacer clic en Siguiente pide `pagina=2` y la tabla anterior queda en pantalla, atenuada, hasta que llegan las filas nuevas. El `LoadingState` no aparece.
- [ ] Mientras la página nueva carga, Anterior y Siguiente están deshabilitados.
- [ ] Volver a una página ya visitada la muestra sin una petición nueva.
- [ ] Aplicar filtros estando en la página 3 pide `pagina=1` con los filtros nuevos.
- [ ] Con un filtro sin resultados se ve el estado vacío del `DataTable`, y el `PaginationBar` no aparece.
- [ ] Con una sola página de resultados se ve "Página 1 de 1" con los dos botones deshabilitados.
- [ ] El selector de cliente de `HistorialFiltersBar` lista todos los clientes activos, no 20, y su petición a `/clientes/all` no lleva `pagina` ni `limite`.
- [ ] Lo mismo vale para `DocumentosFiscalesFiltersBar` y `CreateDocumentoFiscalForm`.
- [ ] `/clientes` (la grilla de tarjetas) pide `GET /clientes` sin params y se ve igual que antes.
- [ ] `/inspeccion-pesajes-by-lote` se ve igual que antes y su petición no lleva `pagina`.
- [ ] Hacer clic en un encabezado ordenable reordena solo las filas de la página visible.

---

## Decisiones

- **Sí:** paginar `/inspeccion-clientes` y `/historial`. **No:** `/clientes`. Es la pantalla donde el operador elige a quién pesar, y su cartera es chica. El backend ya la soporta, así que se puede sumar después.
- **Sí:** `useClientInspection(filtros, pagina?)` con la página **opcional**. **No:** un hook nuevo para la tabla. La firma opcional deja intactos a los tres selectores sin tocarlos, que es justo lo que la paginación opt-in del backend permite.
- **Sí:** mantener el orden de columna del `DataTable`, aunque solo ordene la página visible. Decisión del usuario. **No:** quitar `defaultSorting` y `enableSorting` de las tablas paginadas. Habría mostrado el orden real del servidor, a cambio de encabezados que ya no se pueden clicar.
- **Sí:** `startTransition` en el cambio de página. **No:** el spinner en cada página, que hace saltar la pantalla. **No:** tocar `useExecuteQuery` para usar `placeholderData`, que no existe en `useSuspenseQuery`.
- **Sí:** la página en un `useState` de la ruta, como los filtros. **No:** la página en la URL, que dejaría la mitad del estado de la pantalla en la URL y la otra mitad en memoria.
- **Sí:** aplicar filtros vuelve a la página 1.
- **Sí:** 20 filas fijas, con `limite` explícito. **No:** un selector de tamaño.
- **Sí:** Anterior, Siguiente y el texto con el total. **No:** números de página, ni Primera y Última.
- **Sí:** `PaginationBar` en `components/shared/table/`, junto al `DataTable`, con nombre en inglés como pide `CLAUDE.md` para lo nuevo. **No:** meter la paginación dentro del `DataTable`. `CLAUDE.md` ya fija que filtrar y paginar son del hook de dominio, y el componente sigue pintando lo que recibe.
- **Sí:** `paginacion` opcional en los tipos de respuesta. **No:** tipos de respuesta paginados aparte. Son el mismo endpoint, y la clave existe o no según los params.
- **No:** tests. Decisión del usuario. La verificación es `tsc` más el recorrido manual de los criterios.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El orden de columna engaña: en `/inspeccion-clientes` el `defaultSorting` por nombre ordena las 20 filas de la página, pero esas 20 son las primeras por `created_at`, no las primeras del alfabeto. El usuario puede creer que no existe un cliente que está en la página 2 | Aceptado a conciencia. Si molesta, el arreglo es un param de orden en el backend más el orden manual en el `DataTable`, en un spec de cada lado. En `/historial` el problema casi no se nota, porque su `defaultSorting` (`created_at` desc) coincide con el orden del servidor |
| El backend no desempata por `id`: pesajes del mismo segundo pueden cambiar de lugar entre páginas, y uno puede aparecer dos veces o ninguna | Aceptado en el SPEC 29 del backend. Si se reporta, se arregla allá |
| Un pesaje nuevo, registrado mientras alguien recorre el historial, corre una fila entre páginas | Inherente a la paginación por offset. La caché de cada página además la congela hasta que se invalida |
| Una página que se vacía (por ejemplo, pesajes anulados mientras se está en la última) muestra el estado vacío con "Página 5 de 4" y Anterior habilitado | Aceptado: Anterior sigue funcionando. No se corrige la página automáticamente |
| Si alguien llama a `useClientInspection(filtros, 1)` desde un selector "para optimizar", el selector pasa a mostrar 20 clientes sin avisar | Documentado en `CLAUDE.md`: sin página es lo que mantiene completos a los selectores |

---

## Lo que **no** entra en este spec

- Paginación en `/clientes`.
- Paginación en inspección de pesajes por lote, lotes y documentos fiscales.
- Ordenamiento del lado del servidor.
- Selector de tamaño de página.
- Números de página, Primera y Última.
- La página en la URL.
- Tests del paginador y de los hooks.
- Aplicar filtros sin spinner.

Cada uno de ellos, si se hace, va en su propio spec.
