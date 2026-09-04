import { QualityStatusBadge } from '#/presentation/components/pesajes/PesajeCells'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatWeight } from '#/presentation/helpers/number/formatWeight'
import { useHistorialPesajes } from '#/presentation/hooks/historial/useHistorialPesajes'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

function createColumns(): DataTableColumns<PesajeData> {
    return [
        {
            accessorKey: 'created_at',
            header: 'Fecha',
            enableSorting: true,
            meta: { cellClassName: 'font-bold whitespace-nowrap' },
            cell: ({ row }) => formatDate(row.original.created_at.toLocaleString()),
        },
        {
            accessorKey: 'id',
            header: 'ID',
            enableSorting: true,
            meta: { align: 'right' },
        },
        {
            accessorKey: 'nombre_lote',
            header: 'Lote',
            enableSorting: true,
            meta: { cellClassName: 'font-bold' },
        },
        {
            accessorKey: 'unidad_medida',
            header: 'Unidad de medida',
            enableSorting: true,
            meta: { cellClassName: 'font-bold' },
        },
        {
            accessorKey: 'peso_bruto',
            header: 'Peso bruto',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-semibold' },
            cell: ({ row }) => formatWeight(row.original.peso_bruto),
        },
        {
            accessorKey: 'tara',
            header: 'Tara',
            meta: { align: 'right', cellClassName: 'font-semibold' },
            cell: ({ row }) => formatWeight(row.original.tara),
        },
        {
            accessorKey: 'peso_neto',
            header: 'Peso neto',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-extrabold' },
            cell: ({ row }) => formatWeight(row.original.peso_neto),
        },
        {
            accessorKey: 'estado_calidad',
            header: 'Estado',
            enableSorting: true,
            meta: { align: 'center' },
            cell: ({ row }) => <QualityStatusBadge pesaje={row.original} />,
        },
        {
            accessorKey: 'fuera_de_rango',
            header: 'Fuera de rango',
            meta: { align: 'center' },
            cell: ({ row }) => (row.original.fuera_de_rango ? 'Sí' : 'No'),
        },
    ]
}

export function HistorialPesajesTable() {
    const { pesajes } = useHistorialPesajes();

    const columns = createColumns();

    return (
        <DataTable
            data={pesajes}
            columns={columns}
            getRowId={(pesaje) => String(pesaje.id)}
            defaultSorting={[{ id: 'created_at', desc: true }]}
            maxHeight="34rem"
            emptyTitle="No hay pesajes registrados"
            emptyDescription="Todavía no se registró ningún pesaje en la planta."
        />
    )
}
