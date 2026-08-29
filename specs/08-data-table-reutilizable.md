# SPEC 08 — DataTable reutilizable

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-08-29
> **Objetivo:** Crear un componente `<DataTable>` genérico sobre `@tanstack/react-table` y la primitiva `table` de shadcn, con ordenamiento por columna, fila clickeable, header pegajoso, estado vacío y dark mode, sin que ninguna pantalla existente cambie.

---

## Por qué existe este spec

Hoy el proyecto tiene **una sola** tabla, `src/presentation/views/historial/PesajesTable.tsx`, y está escrita a mano: `<table>` crudo, `bg-white` y una paleta `slate-*`/`indigo-*` hardcodeada que **no** existe en modo oscuro, y una paginación decorativa con los botones `1 2 3 … 42` cableados en el JSX y un texto fijo que dice "1-5 de 1,248 registros" sobre un array de cinco elementos.

Ese archivo es el aviso: la próxima pantalla con tabla va a copiar y pegar ese markup, con sus colores y su paginación falsa incluidos. Antes de que existan tres copias conviene tener una tabla común.

Este spec entrega la herramienta y **no** la usa. `PesajesTable` queda exactamente como está: migrar el historial implica decidir qué pasa con su paginación falsa, y eso es otra conversación. Es la misma jugada de SPEC 07 con `<Can>`.

---

## Alcance

**Dentro:**

- Dependencia nueva `@tanstack/react-table` (v9).
- Primitiva `src/components/ui/table.tsx`, instalada con el CLI de shadcn y **sin modificar a mano**.
- Componente `src/presentation/components/shared/table/DataTable.tsx`: genérico en `TData`, recibe `data` + `columns` y monta `useReactTable` por dentro.
- Ordenamiento por columna: click en el header alterna asc → desc → sin orden, solo en las columnas que lo declaren.
- Fila clickeable opcional (`onRowClick`), accesible con teclado.
- Header pegajoso y scroll horizontal del contenedor.
- Estado vacío propio: sin filas, la tabla pinta un `<EmptyState>` que ocupa todo el ancho.
- Alineación y clases por columna a través de `meta`, tipada con el `metaHelper` de v9.
- Apariencia única alineada a los tokens del proyecto (`bg-surface`, `text-text-main`, `text-text-muted`, `border-border-ui`, `shadow-clay-card`), con dark mode.
- Tests de vitest del componente.
- Actualización de `CLAUDE.md` con la sección de tablas.

**Fuera de alcance (para specs futuros):**

- **Migrar `PesajesTable`.** El historial sigue con su tabla a mano, sus colores hardcodeados y su paginación decorativa. Ninguna pantalla cambia en este spec.
- Paginación, de cliente o de servidor. La tabla pinta todas las filas que recibe.
- Búsqueda o filtros, globales o por columna. Filtrar es del hook de dominio, que es quien conoce el endpoint y sus params.
- Selección de filas con checkbox y acciones masivas.
- Visibilidad de columnas configurable por el usuario, y su persistencia.
- Filas expandibles, agrupación y subfilas.
- Virtualización de filas.
- Estado de carga propio (`isLoading`, filas esqueleto). La carga la resuelve `<Suspense>`, como manda `CLAUDE.md`.
- Ordenamiento controlado desde afuera o persistido en la URL.
- Variantes visuales por prop (densidad, zebra, bordes).
- Transformar las filas en cards en pantalla chica.
- Exportar a CSV o PDF.
- Convertir las grillas de cards de Clientes y Lotes en tablas.

---

## Modelo de datos

Este spec no introduce datos de dominio ni toca `localStorage`. Lo que introduce son los tipos del componente.

### El set de features

En v9 las capacidades de la tabla no son opciones sueltas: se registran una sola vez en un objeto de features, y ese objeto es el que tipa todo lo demás. `DataTable.tsx` lo declara a nivel de módulo y lo exporta, porque las pantallas lo necesitan para tipar sus columnas:

```ts
export const dataTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns,
    columnMeta: metaHelper<DataTableColumnMeta>(),
})
```

Se registra el objeto `sortFns` completo, no un subconjunto: la tabla es genérica y no puede saber si una columna trae texto, números o fechas, y `sortFn: 'auto'` necesita los comparadores registrados para resolver cada tipo.

### La `meta` de columna

En v8 esto se hacía con `declare module`. En v9 esa augmentación global está **desaconsejada** por la propia librería: la `meta` se tipa con `metaHelper` dentro del set de features, y así queda acotada a esta tabla en vez de a todo el proyecto.

```ts
export interface DataTableColumnMeta {
    /** Alineación del header y de las celdas. Por defecto 'left'. */
    align?: 'left' | 'center' | 'right'
    /** Clases extra para el <th>. */
    headerClassName?: string
    /** Clases extra para el <td>. */
    cellClassName?: string
}
```

### Columnas

Se usan los `ColumnDef` de `@tanstack/react-table` tal cual, sin envoltorio propio. Lo único que cambia frente a v8 es que el tipo lleva primero el genérico de features. Una definición de columnas queda así (ejemplo, no entra al repo):

```ts
const columns: DataTableColumns<Pesaje> = [
    {
        accessorKey: 'loteId',
        header: 'Lote ID',
        enableSorting: true,
    },
    {
        accessorKey: 'peso',
        header: 'Peso (KG)',
        meta: { align: 'right' },
        cell: ({ row }) => formatearPeso(row.original.peso),
    },
]
```

`DataTableColumns<TData>` es un alias exportado por `DataTable.tsx` sobre `ColumnDef<typeof dataTableFeatures, TData, any>[]`, para que la pantalla no escriba el genérico de features a mano.

### Props del componente

```ts
interface DataTableProps<TData> {
    data: TData[]
    columns: DataTableColumns<TData>
    /** Id estable de fila. Sin esto, react-table usa el índice del array. */
    getRowId?: (row: TData) => string
    /** Vuelve las filas clickeables: cursor, hover, foco y Enter/Espacio. */
    onRowClick?: (row: TData) => void
    /** Orden inicial. El estado vive dentro del componente. */
    defaultSorting?: SortingState
    /** Texto del estado vacío. */
    emptyTitle?: string
    emptyDescription?: string
    /** Alto máximo del área scrolleable; es lo que activa el header pegajoso. */
    maxHeight?: string
    className?: string
}
```

`SortingState` se importa de `@tanstack/react-table`; el único tipo propio que aprende el consumidor es `DataTableColumns<TData>`, que es un alias sobre `ColumnDef`.

---

## Plan de implementación

Cada paso deja el proyecto compilando y la suite en verde.

1. **Instalar las dependencias.**
   - `npm i @tanstack/react-table` — instala la v9, que declara `react: ">=18"`.
   - `npx shadcn@latest add table` — deja `src/components/ui/table.tsx` con `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`. El archivo **no se toca**: sus clases neutras se sobreescriben desde el `DataTable` por `className`.
   Verificación: `npx tsc --noEmit` pasa y `src/components/ui/table.tsx` existe.

2. **Crear `src/presentation/components/shared/table/DataTable.tsx` con el camino mínimo.** El set `dataTableFeatures` a nivel de módulo (por ahora solo con `columnMeta: metaHelper<DataTableColumnMeta>()`), el alias `DataTableColumns<TData>`, el componente genérico `<TData>`, `useTable({ features, columns, data, getRowId })` y el render de header y filas con `<table.FlexRender>` sobre las primitivas de shadcn. Sin orden, sin click, sin vacío todavía.
   Verificación: `npx tsc --noEmit` pasa.

3. **Aplicar la identidad visual.** Contenedor `bg-surface rounded-3xl border border-border-ui shadow-clay-card overflow-hidden`; header en `text-xs font-bold uppercase tracking-wider text-text-muted` sobre `bg-bg-app`; celdas en `text-sm text-text-main`; separadores con `divide-y divide-border-ui`; hover de fila sutil. Solo tokens semánticos: **ningún** `slate-*`, `white` ni `indigo-*` crudo. La alineación sale de `column.columnDef.meta.align`, resuelta con un mapa `{ left, center, right }`, más `headerClassName` / `cellClassName` si vienen.
   Verificación: `npm run dev`, montar la tabla con datos de prueba y alternar el tema; nada queda ilegible en oscuro.

4. **Header pegajoso y scroll horizontal.** La primitiva `Table` ya se envuelve sola en un `div[data-slot=table-container]` con `overflow-x-auto`, que es el contenedor de scroll real; lo único que le falta es el alto máximo. El `DataTable` se lo aplica desde su propio wrapper con una variante arbitraria sobre ese slot, sin editar la primitiva. El `<thead>` lleva `sticky top-0 z-10` con fondo opaco propio — sin fondo opaco, las filas se ven **a través** del header al scrollear.
   Verificación: manual, con veinte filas y `maxHeight="24rem"`: el header queda fijo y no se transparenta.

5. **Ordenamiento.** Se suman al set de features `rowSortingFeature`, `sortedRowModel: createSortedRowModel()` y el registro `sortFns`. El estado arranca por `initialState: { sorting: defaultSorting }` y lo administra la tabla: en v9 `initialState.<slice>` es el mecanismo previsto para un estado interno con valor inicial, sin `useState` ni `onSortingChange`. Tres opciones más, porque los defaults de la librería no coinciden con lo que pide este spec: `defaultColumn.enableSorting: false` (la librería ordena **todas** las columnas por defecto; acá el orden es opt-in y cada columna lo pide con `enableSorting: true`), `defaultColumn.sortDescFirst: false` (sin esto una columna numérica arranca descendente y el ciclo sale al revés del resto de la tabla) y `enableSortingRemoval: true` para que el tercer click vuelva al orden original. En las columnas con orden habilitado, el contenido del `<th>` es un `<button>` con el título y un ícono de lucide (`ChevronUp` / `ChevronDown` / `ChevronsUpDown` cuando no hay orden), cableado a `column.getToggleSortingHandler()`. El `<th>` lleva `aria-sort` derivado de `column.getIsSorted()`. Las columnas sin orden (`column.getCanSort()` falso) se pintan como texto plano, sin botón ni cursor.
   Verificación: click en un header ordena asc, el segundo desc, el tercero vuelve al orden original.

6. **Fila clickeable.** Con `onRowClick`, cada `<TableRow>` recibe `onClick`, `tabIndex={0}`, `role="button"`, `cursor-pointer` y un `onKeyDown` que dispara con Enter y Espacio (con `preventDefault` en Espacio, que si no scrollea la página). Sin `onRowClick`, la fila no recibe nada de eso: ni `tabIndex`, ni `role`, ni cursor.
   Verificación: con teclado, Tab llega a las filas y Enter dispara el callback; sin la prop, Tab las saltea.

7. **Estado vacío.** Con `data.length === 0`, el `<tbody>` es una sola fila con un `<TableCell colSpan={columns.length}>` que contiene el `<EmptyState>` de `shared/`, alimentado por `emptyTitle` (por defecto `'No hay registros'`) y `emptyDescription`. El header se sigue pintando: una tabla sin encabezados no comunica qué es lo que está vacío.
   Verificación: con `data={[]}` se ve el header y el estado vacío centrado, sin errores en consola.

8. **Crear `src/presentation/components/shared/table/DataTable.test.tsx`** (`// @vitest-environment jsdom`). Casos:
   - Pinta un `<th>` por columna y una fila por elemento de `data`.
   - Una celda con `cell` propio renderiza el nodo devuelto, no el valor crudo.
   - Click en un header ordenable reordena las filas; el segundo click invierte el orden.
   - Un header no ordenable no renderiza `<button>` y su `<th>` no expone `aria-sort`.
   - `aria-sort` refleja el estado (`none` → `ascending` → `descending`).
   - `defaultSorting` arranca con las filas ya ordenadas.
   - `onRowClick` se dispara con el objeto original de la fila, no con el modelo de react-table.
   - Con `onRowClick`, Enter sobre una fila enfocada dispara el callback.
   - Sin `onRowClick`, las filas no tienen `tabIndex` ni `role="button"`.
   - `data={[]}` pinta el estado vacío con el texto recibido y **no** pinta ninguna fila de datos.
   - `getRowId` se usa como key: cambiar el orden del array no remonta las filas.
   Verificación: `npx vitest run src/presentation/components/shared/table/DataTable.test.tsx` pasa.

9. **Actualizar `CLAUDE.md`.** Una sección de tablas: `<DataTable>` como la única forma de pintar una tabla nueva, la API `data` + `columns`, la `meta` de columna para alineación, y las dos reglas — la carga es de `<Suspense>` (la tabla no tiene `isLoading`) y filtrar/paginar es del hook de dominio, no del componente. Anotar que `PesajesTable` es previo a este spec y queda pendiente de migración.

10. **Verificación final:** `npx tsc --noEmit` y `npx vitest run` completos, más el recorrido manual de los criterios de aceptación en los dos temas.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo, incluido `DataTable.test.tsx`.
- [ ] `@tanstack/react-table` figura en `dependencies` de `package.json`.
- [ ] `src/components/ui/table.tsx` existe y su contenido es el que generó el CLI de shadcn, sin ediciones a mano.
- [ ] `<DataTable data={filas} columns={columnas} />` pinta un `<th>` por columna y un `<tr>` por elemento, sin más props.
- [ ] Una columna con `meta: { align: 'right' }` alinea a la derecha su header **y** sus celdas.
- [ ] Click en el header de una columna ordenable ordena ascendente; el segundo click, descendente; el tercero vuelve al orden del array original.
- [ ] El `<th>` de una columna ordenable expone `aria-sort` con el valor correspondiente, y el de una no ordenable no expone `aria-sort` ni contiene un `<button>`.
- [ ] Con `defaultSorting`, la primera pintada ya sale ordenada.
- [ ] Con `onRowClick`, un click en cualquier parte de la fila dispara el callback con el objeto original.
- [ ] Con `onRowClick`, la fila es alcanzable con Tab y Enter dispara el callback.
- [ ] Sin `onRowClick`, las filas no son enfocables con Tab y no muestran `cursor-pointer`.
- [ ] Con `maxHeight` y filas suficientes para scrollear, el header queda fijo y las filas **no** se ven a través de él.
- [ ] Cuando las columnas no entran en el ancho, el contenedor scrollea en horizontal y la página **no**.
- [ ] Con `data={[]}`, se ven los headers y un estado vacío con el texto de `emptyTitle` / `emptyDescription`, y ninguna fila de datos.
- [ ] En modo oscuro, header, filas, hover, separadores y estado vacío son legibles; ningún color crudo (`bg-white`, `text-slate-*`, `text-indigo-*`) aparece en `DataTable.tsx`.
- [ ] `PesajesTable.tsx` y el resto de las pantallas se comportan **exactamente igual** que antes de este spec.
- [ ] `CLAUDE.md` documenta el componente, su API y las dos reglas de alcance.

---

## Decisiones

- **Sí:** `@tanstack/react-table` como motor. Decisión del usuario. Es el camino oficial de shadcn para data-table y encaja con el stack, que ya es TanStack de punta a punta; el ordenamiento y los modelos de fila vienen probados en vez de escritos y testeados acá.
- **No:** una tabla propia sin dependencias. Ahorra ~14kb y termina reimplementando el modelo de filas ordenadas con peor cobertura.
- **Sí:** v9, no v8. Decisión del usuario, tomada durante la implementación: el spec se escribió asumiendo v8 y `npm i` instaló la 9.2.4. v9 es la línea que recibe soporte, declara `react: ">=18"` y trae skills oficiales para agentes dentro del paquete. Se paga con menos ejemplos dando vueltas: los data-table de shadcn que circulan siguen siendo de v8.
- **No:** fijar `@tanstack/react-table@^8`. Entrar con una línea que ya tiene sucesora deja la migración pendiente desde el día uno, para un componente que recién nace.
- **Sí:** la `meta` de columna se tipa con `metaHelper` dentro del set de features. Es lo que v9 indica explícitamente, y mantiene el tipo acotado a esta tabla.
- **No:** la augmentación global `declare module '@tanstack/table-core'`. Era el camino de v8 y la propia librería lo marca como error en v9: ensucia el tipo de cualquier otra tabla del proyecto.
- **Sí:** el orden interno arranca con `initialState: { sorting }`. En v9 esa es la forma prevista de un estado que la tabla administra con un valor inicial; `state` + `on[State]Change` es para estado controlado desde afuera, que este spec descartó.
- **Sí:** API encapsulada, `data` + `columns`. Decisión del usuario. El `useReactTable` vive dentro del componente y la pantalla solo declara columnas; el boilerplate no se repite en cada consumidor.
- **No:** recibir la instancia `table` ya creada. Es más flexible, pero obliga a montar el hook y los row models en cada pantalla para un caso que todavía no existe. El día que una pantalla necesite agrupar o filtrar del lado de react-table, se agrega el escape hatch entonces.
- **Sí:** `ColumnDef` de la librería tal cual, sin un tipo `Column<T>` propio. Un envoltorio propio obliga a mantener una traducción y a documentar por qué la del upstream no sirve. Lo único que se agrega es `meta`, que es el punto de extensión que la librería ya provee. `DataTableColumns<TData>` no es un tipo nuevo: es un alias que ahorra repetir el genérico de features.
- **No:** un `createTableHook` propio que envuelva features, hook y componentes. Es más prolijo en el punto de uso, pero agrega una capa de API que este spec no contempla.
- **Sí:** la primitiva `table.tsx` se instala con el CLI y no se toca. Decisión del usuario. Es la regla de `CLAUDE.md`, y deja el archivo actualizable con un `shadcn add` futuro.
- **Sí:** los tokens del proyecto se aplican por `className` desde `DataTable.tsx`. Es la única forma de tener el look correcto sin editar la primitiva, y concentra la apariencia de todas las tablas de la app en un archivo.
- **Sí:** una sola apariencia, sin variantes. Decisión del usuario. El punto de tener una tabla común es que todas se vean iguales; una prop `density` o `zebra` es la puerta para que cada pantalla se vea distinta.
- **Sí:** el estado de orden vive dentro del componente, con `defaultSorting` como única perilla. Decisión del usuario. Ninguna pantalla necesita hoy persistir el orden en la URL.
- **No:** ordenamiento controlado (`sorting` / `onSortingChange`). Se agrega el día que una pantalla lo pida, sin romper a los consumidores existentes: son props nuevas y opcionales.
- **Sí:** el componente resuelve el estado vacío. Es el caso que hoy cada pantalla resolvería a mano con un `if (data.length === 0)` antes de llegar a la tabla, como hace `ClientesView`.
- **No:** un `isLoading` con filas esqueleto. Decisión del usuario. `CLAUDE.md` es explícito: los GET pasan por `useSuspenseQuery` y no hay `isLoading` manual; una prop así invita a reintroducirlo.
- **Sí:** el header se sigue pintando con la tabla vacía. Sin encabezados, el usuario no sabe qué es lo que está vacío.
- **Sí:** en pantalla chica, scroll horizontal y nada más. Decisión del usuario. La app se usa en tablets de planta, donde la tabla entra casi siempre; convertir filas en cards es un segundo render completo que mantener.
- **No:** ocultar columnas por prioridad en pantalla chica. Esconde datos sin que el usuario se entere de que existen.
- **Sí:** sin paginación. Decisión del usuario. Paginar de verdad exige un contrato de backend que hoy no está definido, y una paginación de cliente sobre un array parcial miente sobre el total — que es exactamente el problema que ya tiene `PesajesTable`.
- **Sí:** sin búsqueda ni filtros. Decisión del usuario. Filtrar es del hook de dominio, que es quien conoce el endpoint y sus params; un filtro de cliente dentro de la tabla no escala al día que el backend filtre.
- **No:** un slot `toolbar` libre. Sin lógica adentro, es un `<div>` que la pantalla puede poner arriba de la tabla por su cuenta.
- **Sí:** la fila clickeable es accesible por teclado (`tabIndex`, `role="button"`, Enter y Espacio). Un `onClick` en un `<tr>` es invisible para quien no usa mouse, y en planta se opera con guantes y teclado más de lo que se admite.
- **Sí:** ese tratamiento se aplica **solo** con `onRowClick`. Poner `tabIndex={0}` en filas que no hacen nada llena el recorrido de Tab de paradas muertas.
- **Sí:** ninguna pantalla se migra en este spec. Decisión del usuario. Migrar `PesajesTable` obliga a decidir qué pasa con su paginación decorativa y con el texto "1-5 de 1,248", que es una discusión de producto, no de componentes.
- **Sí:** identificadores en inglés (`DataTable`, `onRowClick`, `emptyTitle`, `getRowId`). Archivo nuevo, regla de `CLAUDE.md`.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El componente entra sin ningún consumidor: código no ejercitado en producción, y una API diseñada contra casos imaginados. | Los tests del paso 8 lo cubren, y las columnas del historial —badge por estado, peso formateado, celda de dos líneas, fila teñida— fueron el caso real contra el que se dimensionó la API. Aun así, la primera migración real es la que va a decir si la `meta` alcanza. |
| El `<thead>` pegajoso se transparenta y las filas se ven a través. | El paso 4 le pone fondo opaco propio (`bg-bg-app`), no heredado del contenedor, y hay un criterio de aceptación específico. |
| La `meta` de columna queda atada al set `dataTableFeatures`: una segunda tabla del proyecto con otras necesidades tendría que compartir ese tipo o declarar su propio set. | Es el diseño de v9 y es preferible al problema inverso de v8, donde la augmentación global contaminaba cualquier tabla. Con un solo `DataTable` en el proyecto, la `meta` crece en su archivo. |
| Las clases de la primitiva de shadcn (`bg-muted`, `text-muted-foreground`) apuntan a variables que este proyecto no define, así que caen a un valor vacío o heredado. | El `DataTable` pasa `className` con los tokens del proyecto en cada slot, y `tailwind-merge` (ya instalado) resuelve el conflicto a favor del último. El criterio de dark mode es lo que verifica que ninguna clase quedó sin sobreescribir. |
| v9 es reciente: los ejemplos de data-table de shadcn que circulan son de v8 (`useReactTable`, `getCoreRowModel`, `flexRender`), y copiar uno produce código que no compila. | El paquete trae skills oficiales en `node_modules/@tanstack/react-table/skills/` y `node_modules/@tanstack/table-core/skills/`, incluida `migrate-v8-to-v9`. Son la referencia al tocar este componente, por encima de cualquier ejemplo de internet. |
| Sin virtualización, una tabla de miles de filas monta miles de `<tr>` y traba la pestaña. | Hoy no hay endpoint que devuelva esos volúmenes de una vez. Cuando lo haya, el problema real es la paginación de servidor, que ya está anotada como spec futuro. |

---

## Lo que **no** entra en este spec

- Migrar `PesajesTable` ni ninguna otra pantalla al `DataTable`.
- Paginación, de cliente o de servidor.
- Búsqueda, filtro global o filtros por columna.
- Selección de filas y acciones masivas.
- Visibilidad de columnas configurable y su persistencia.
- Filas expandibles, agrupación y virtualización.
- Estado de carga propio con filas esqueleto.
- Ordenamiento controlado desde afuera o persistido en la URL.
- Variantes visuales por prop (densidad, zebra, bordes).
- Cards apiladas en pantalla chica.
- Exportar a CSV o PDF.
- Convertir las grillas de cards de Clientes y Lotes en tablas.

Cada uno de ellos, si se hace, va en su propio spec.
