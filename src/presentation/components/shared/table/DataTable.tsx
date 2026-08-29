import {
    metaHelper,
    tableFeatures,
    useTable,
    type ColumnDef,
    type RowData,
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
    columnMeta: metaHelper<DataTableColumnMeta>(),
})

/** Las columnas de un DataTable, sin repetir el genérico de features. */
export type DataTableColumns<TData extends RowData> = ColumnDef<
    typeof dataTableFeatures,
    TData
>[]

const alignClasses: Record<
    NonNullable<DataTableColumnMeta['align']>,
    string
> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
}

interface DataTableProps<TData extends RowData> {
    data: TData[]
    columns: DataTableColumns<TData>
    /** Id estable de fila. Sin esto, la tabla usa el índice del array. */
    getRowId?: (row: TData) => string
    className?: string
}

export function DataTable<TData extends RowData>({
    data,
    columns,
    getRowId,
    className,
}: DataTableProps<TData>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data,
        getRowId,
    })

    return (
        <div
            className={cn(
                'bg-surface rounded-3xl border border-border-ui shadow-clay-card overflow-hidden',
                className,
            )}
        >
            <Table>
                {/* Fondo opaco: es también lo que sostiene el header pegajoso. */}
                <TableHeader className="bg-bg-app">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                            key={headerGroup.id}
                            className="border-0 hover:bg-transparent"
                        >
                            {headerGroup.headers.map((header) => {
                                const meta = header.column.columnDef.meta

                                return (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            'h-12 px-6 text-xs font-bold uppercase tracking-wider text-text-muted',
                                            alignClasses[meta?.align ?? 'left'],
                                            meta?.headerClassName,
                                        )}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <table.FlexRender header={header} />
                                        )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody className="divide-y divide-border-ui">
                    {table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            // `border-0` desactiva el borde de la primitiva, que
                            // en Tailwind v4 sale del color del texto.
                            className="border-0 transition-colors hover:bg-bg-app/60"
                        >
                            {row.getAllCells().map((cell) => {
                                const meta = cell.column.columnDef.meta

                                return (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            'px-6 py-4 text-sm text-text-main',
                                            alignClasses[meta?.align ?? 'left'],
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
