import { PesajeRowActions } from '#/presentation/components/inspeccion-pesajes/PesajeRowActions'
import { QualityStatusBadge } from '#/presentation/components/pesajes/PesajeCells'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatWeight } from '#/presentation/helpers/number/formatWeight'
import { useGetInspeccionPesajes } from '#/presentation/hooks/inspeccion-pesajes/useInspeccionPesajes'
import type { FiltrosPesajes } from '#/presentation/schema/inspeccion-pesajes/filtrosPesajesSchema'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

function crearColumnas(): DataTableColumns<PesajeData> {
    return [
        {
            id: 'acciones',
            header: 'Acciones',
            meta: { align: 'center', cellClassName: 'py-2' },
            cell: ({ row }) => <PesajeRowActions pesaje={row.original} />,
        },
        {
            accessorKey: 'created_at',
            header: 'Fecha creacion Pesaje',
            enableSorting: true,
            meta: { cellClassName: 'font-bold whitespace-nowrap' },
            cell: ({ row }) => formatDate(row.original.created_at),
        },
        {
            accessorKey: 'id',
            header: 'ID',
            enableSorting: true,
            meta: { align: 'right' },
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
            header: 'Peso fuera de rango',
            cell: ({ row }) => (row.original.fuera_de_rango ? 'Si' : 'No'),
        },
        {
            accessorKey: 'usuario',
            header: 'Usuario Creacion Pesaje',
            enableSorting: true,
        },
    ]
}

interface PesajesInspectionViewProps {
    loteId: number
    filtros: FiltrosPesajes
}

export function PesajesInspectionView({ loteId, filtros }: PesajesInspectionViewProps) {
    const { pesajes } = useGetInspeccionPesajes({ loteId, filtros })

    const columns = crearColumnas()

    return (
        <DataTable
            data={pesajes}
            columns={columns}
            getRowId={(pesaje) => String(pesaje.id)}
            defaultSorting={[{ id: 'created_at', desc: true }]}
            maxHeight="32rem"
            emptyTitle="Este lote no tiene pesajes"
            emptyDescription="Todavía no se registraron pesajes para este lote."
        />
    )
}
