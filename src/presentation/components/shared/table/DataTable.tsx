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

interface DataTableProps<TData extends RowData> {
    data: TData[]
    columns: DataTableColumns<TData>
    /** Id estable de fila. Sin esto, la tabla usa el índice del array. */
    getRowId?: (row: TData) => string
}

export function DataTable<TData extends RowData>({
    data,
    columns,
    getRowId,
}: DataTableProps<TData>) {
    const table = useTable({
        features: dataTableFeatures,
        columns,
        data,
        getRowId,
    })

    return (
        <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                                {header.isPlaceholder ? null : (
                                    <table.FlexRender header={header} />
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                ))}
            </TableHeader>

            <TableBody>
                {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                        {row.getAllCells().map((cell) => (
                            <TableCell key={cell.id}>
                                <table.FlexRender cell={cell} />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
