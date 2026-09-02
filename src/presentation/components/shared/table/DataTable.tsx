import type { CSSProperties } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import {
    createSortedRowModel,
    metaHelper,
    rowSortingFeature,
    sortFns,
    tableFeatures,
    useTable,
    type ColumnDef,
    type RowData,
    type SortingState,
} from '@tanstack/react-table'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { EmptyState } from '#/presentation/components/shared/EmptyState'

/**
 * Lo que una columna puede pedirle a la tabla más allá de su contenido.
 *
 * En v8 esto se declaraba augmentando el módulo con `declare module`, lo que
 * ensuciaba el tipo de cualquier otra tabla del proyecto. En v9 se tipa acá,
 * dentro del set de features, y queda acotado a este DataTable.
 */
export interface DataTableColumnMeta {
    /** Alineación del header y de las celdas. Por defecto 'left'. */
    align?: 'left' | 'center' | 'right'
    /** Clases extra para el <th>. */
    headerClassName?: string
    /** Clases extra para el <td>. */
    cellClassName?: string
}

/**
 * Las capacidades que esta tabla registra. En v9 no son opciones sueltas: se
 * declaran una sola vez acá y este objeto es el que tipa las columnas.
 *
 * Se exporta porque las pantallas lo necesitan para tipar las suyas, aunque
 * casi siempre alcanza con el alias `DataTableColumns`.
 */
export const dataTableFeatures = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    // El registro completo de comparadores: como la tabla es genérica, no puede
    // saber si una columna trae texto, números o fechas, y `sortFn: 'auto'`
    // necesita tenerlos registrados para resolver bien cada tipo.
    sortFns,
    columnMeta: metaHelper<DataTableColumnMeta>(),
})

/** Las columnas de un DataTable, sin repetir el genérico de features. */
export type DataTableColumns<TData extends RowData> = ColumnDef<
    typeof dataTableFeatures,
    TData
>[]

type Align = NonNullable<DataTableColumnMeta['align']>

const alignClasses: Record<Align, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
}

/**
 * Una columna alineada a la derecha es, casi siempre, numérica: las cifras
 * tabulares mantienen el punto decimal en la misma vertical fila a fila.
 */
const numericClasses: Record<Align, string> = {
    left: '',
    center: '',
    right: 'tabular-nums',
}

/** El botón de orden ocupa todo el ancho del <th>, así que se alinea solo. */
const justifyClasses: Record<Align, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
}

const ariaSortValues = {
    asc: 'ascending',
    desc: 'descending',
} as const

interface DataTableProps<TData extends RowData> {
    data: TData[]
    columns: DataTableColumns<TData>
    /** Id estable de fila. Sin esto, la tabla usa el índice del array. */
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

export function DataTable<TData extends RowData>({
    data,
    columns,
    getRowId,
    onRowClick,
    defaultSorting,
    emptyTitle = 'No hay registros',
    emptyDescription,
    maxHeight,
    className,
}: DataTableProps<TData>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data,
        getRowId,
        // El orden lo administra la tabla: `initialState` es la forma prevista
        // en v9 para un estado interno con valor inicial.
        initialState: { sorting: defaultSorting ?? [] },
        defaultColumn: {
            // La librería ordena todas las columnas por defecto; acá el orden
            // es opt-in, y cada columna lo pide con `enableSorting: true`.
            enableSorting: false,
            // Sin esto, una columna numérica arranca descendente y el ciclo de
            // clicks sale al revés del resto de la tabla.
            sortDescFirst: false,
        },
        // Tercer click sobre el header: vuelve al orden original.
        enableSortingRemoval: true,
    })

    const rows = table.getRowModel().rows

    return (
        <div
            className={cn(
                'bg-surface rounded-2xl border border-border-ui shadow-clay-card overflow-hidden',
                // La franja superior separa la tabla de lo que tenga arriba sin
                // sumar otra línea dura al diseño.
                'relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-px before:bg-linear-to-r before:from-transparent before:via-brand/20 before:to-transparent',
                // El contenedor de scroll real es el div que monta la primitiva
                // `Table`, que no acepta className: el alto máximo se le aplica
                // desde acá, apuntando a su slot, para no editar table.tsx.
                maxHeight &&
                    '[&>[data-slot=table-container]]:max-h-[var(--data-table-max-h)] [&>[data-slot=table-container]]:overflow-y-auto',
                className,
            )}
            style={
                maxHeight
                    ? ({ '--data-table-max-h': maxHeight } as CSSProperties)
                    : undefined
            }
        >
            <Table>
                {/* El fondo opaco es lo que sostiene el header pegajoso: sin él,
                    las filas se ven a través al scrollear. El `backdrop-blur`
                    es sólo el matiz; el color de abajo no puede faltar. */}
                <TableHeader className="sticky top-0 z-10 bg-bg-app/90 backdrop-blur-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                            key={headerGroup.id}
                            // Sin color, el `border-b` de la primitiva sale del
                            // color del texto; acá se le pasa el token.
                            className="border-b border-border-ui hover:bg-transparent"
                        >
                            {headerGroup.headers.map((header) => {
                                const meta = header.column.columnDef.meta
                                const align = meta?.align ?? 'left'
                                const puedeOrdenar = header.column.getCanSort()
                                const orden = header.column.getIsSorted()

                                return (
                                    <TableHead
                                        key={header.id}
                                        aria-sort={
                                            puedeOrdenar
                                                ? orden
                                                    ? ariaSortValues[orden]
                                                    : 'none'
                                                : undefined
                                        }
                                        className={cn(
                                            'h-11 px-6 text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-text-muted',
                                            alignClasses[align],
                                            meta?.headerClassName,
                                        )}
                                    >
                                        {header.isPlaceholder ? null : puedeOrdenar ? (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={cn(
                                                    'group/sort -mx-2 flex w-[calc(100%+1rem)] cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 py-1.5 uppercase transition-colors hover:bg-brand/5 hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                                                    // La columna activa se lee de
                                                    // un vistazo, sin buscar la
                                                    // flechita.
                                                    orden && 'text-text-main',
                                                    justifyClasses[align],
                                                )}
                                            >
                                                <table.FlexRender header={header} />

                                                {/* El indicador vive en su propio
                                                    chip: reserva el espacio, así
                                                    el título no se corre al
                                                    cambiar el orden. */}
                                                <span
                                                    className={cn(
                                                        'flex size-4 shrink-0 items-center justify-center rounded-md transition-colors',
                                                        orden
                                                            ? 'bg-brand/10 text-brand'
                                                            // Nunca invisible: en
                                                            // una pantalla táctil
                                                            // no hay hover que lo
                                                            // revele.
                                                            : 'text-text-muted opacity-35 group-hover/sort:opacity-70',
                                                    )}
                                                >
                                                    {orden === 'asc' ? (
                                                        <ChevronUp className="size-3" />
                                                    ) : orden === 'desc' ? (
                                                        <ChevronDown className="size-3" />
                                                    ) : (
                                                        <ChevronsUpDown className="size-3" />
                                                    )}
                                                </span>
                                            </button>
                                        ) : (
                                            <table.FlexRender header={header} />
                                        )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>

                {/* La última fila no lleva línea: el borde de la card ya cierra
                    la tabla, y dos líneas juntas se ven como un error. */}
                <TableBody className="divide-y divide-border-ui/70">
                    {rows.length === 0 && (
                        <TableRow className="border-0 hover:bg-transparent">
                            {/* El header se sigue pintando: sin encabezados,
                                nadie sabe qué es lo que está vacío. */}
                            <TableCell
                                colSpan={table.getAllLeafColumns().length}
                                className="p-0 whitespace-normal"
                            >
                                <EmptyState
                                    title={emptyTitle}
                                    description={emptyDescription}
                                    // La card ya tiene su borde: adentro, el
                                    // recuadro punteado sería un marco doble.
                                    className="border-0"
                                />
                            </TableCell>
                        </TableRow>
                    )}

                    {rows.map((row) => (
                        <TableRow
                            key={row.id}
                            // Sin `role="button"`: pisaría el rol implícito de
                            // fila y la tabla dejaría de anunciarse como tabla.
                            // El foco y Enter/Espacio salen de `tabIndex` y del
                            // handler, que no dependen del rol.
                            tabIndex={onRowClick ? 0 : undefined}
                            onClick={
                                onRowClick
                                    ? () => onRowClick(row.original)
                                    : undefined
                            }
                            onKeyDown={
                                onRowClick
                                    ? (evento) => {
                                          if (
                                              evento.key !== 'Enter' &&
                                              evento.key !== ' '
                                          ) {
                                              return
                                          }

                                          // El espacio scrollea la página si no
                                          // se lo frena.
                                          evento.preventDefault()
                                          onRowClick(row.original)
                                      }
                                    : undefined
                            }
                            // `border-0` desactiva el borde de la primitiva, que
                            // en Tailwind v4 sale del color del texto.
                            className={cn(
                                'group/row border-0 transition-colors duration-150 hover:bg-brand/[0.035]',
                                onRowClick &&
                                    'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                            )}
                        >
                            {row.getAllCells().map((cell, indice) => {
                                const meta = cell.column.columnDef.meta
                                const align = meta?.align ?? 'left'

                                return (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            'px-6 py-3.5 text-sm text-text-main',
                                            alignClasses[align],
                                            numericClasses[align],
                                            // La barra de la izquierda marca la
                                            // fila apuntada. Va en la primera
                                            // celda y no en el <tr>, porque con
                                            // los bordes colapsados de la tabla
                                            // una sombra sobre la fila no se
                                            // pinta parejo.
                                            indice === 0 &&
                                                onRowClick &&
                                                'transition-shadow group-hover/row:shadow-[inset_2px_0_0_0_var(--color-brand)]',
                                            meta?.cellClassName,
                                        )}
                                    >
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
