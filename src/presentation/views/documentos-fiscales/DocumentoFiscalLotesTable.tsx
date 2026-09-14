import { EmptyValue } from '#/presentation/components/documentos-fiscales/DocumentoFiscalCells'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatDecimal } from '#/presentation/helpers/number/formatDecimal'
import { formatWeight } from '#/presentation/helpers/number/formatWeight'
import { useGetDetalleDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useGetDetalleDocumentoFiscal'
import type { LoteDocumentoFiscal } from '#/presentation/types/documentos-fiscales/detalle-documento-fiscal-response'

function createColumns(): DataTableColumns<LoteDocumentoFiscal> {
    return [
        {
            accessorKey: 'lote_id',
            header: 'ID',
            enableSorting: true,
            meta: { align: 'right' },
        },
        {
            accessorKey: 'nombre_lote',
            header: 'Lote',
            enableSorting: true,
            meta: { cellClassName: 'font-bold whitespace-nowrap' },
        },
        {
            accessorKey: 'producto',
            header: 'Producto',
            enableSorting: true,
        },
        {
            accessorKey: 'variedad_o_talla',
            header: 'Variedad o talla',
            enableSorting: true,
        },
        {
            accessorKey: 'cantidad',
            header: 'Cantidad facturada',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-semibold' },
            // Sin `formatWeight`: lo facturado puede venir en cajas o sacos, y
            // no siempre coincide con el peso del lote.
            cell: ({ row }) => formatDecimal(row.original.cantidad, 2),
        },
        {
            accessorKey: 'unidad_medida_facturada',
            header: 'Unidad facturada',
            cell: ({ row }) => (
                <EmptyValue valor={row.original.unidad_medida_facturada} />
            ),
        },
        {
            accessorKey: 'peso_neto_total',
            header: 'Peso neto total',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-extrabold' },
            cell: ({ row }) =>
                `${formatWeight(row.original.peso_neto_total)} ${row.original.unidad_medida}`,
        },
        {
            accessorKey: 'pesajes_activos',
            header: 'Pesajes',
            enableSorting: true,
            meta: { align: 'right' },
        },
        {
            accessorKey: 'aprobado_por',
            header: 'Aprobado por',
            enableSorting: true,
        },
        {
            accessorKey: 'aprobado_en',
            header: 'Aprobación',
            enableSorting: true,
            meta: { cellClassName: 'whitespace-nowrap' },
            cell: ({ row }) => formatDate(row.original.aprobado_en),
        },
        {
            accessorKey: 'finalizado_por',
            header: 'Finalizado por',
            enableSorting: true,
        },
        {
            accessorKey: 'finalizado_en',
            header: 'Finalización',
            enableSorting: true,
            meta: { cellClassName: 'whitespace-nowrap' },
            cell: ({ row }) => formatDate(row.original.finalizado_en),
        },
    ]
}

interface DocumentoFiscalLotesTableProps {
    documentoId: number
}

export function DocumentoFiscalLotesTable({
    documentoId,
}: DocumentoFiscalLotesTableProps) {
    const { documento } = useGetDetalleDocumentoFiscal({ documentoId })

    const columns = createColumns()

    return (
        <DataTable
            data={documento.lotes}
            columns={columns}
            getRowId={(lote) => String(lote.lote_id)}
            defaultSorting={[{ id: 'lote_id', desc: false }]}
            maxHeight="32rem"
            emptyTitle="El documento no tiene lotes"
            emptyDescription="Este documento fiscal se emitió sin lotes asociados."
        />
    )
}
