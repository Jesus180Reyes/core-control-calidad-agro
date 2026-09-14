import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDecimal } from '#/presentation/helpers/number/formatDecimal'
import { formatMoney } from '#/presentation/helpers/number/formatMoney'
import { useGetDetalleDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useGetDetalleDocumentoFiscal'
import type { ImpuestoDocumentoFiscal } from '#/presentation/types/documentos-fiscales/detalle-documento-fiscal-response'

function createColumns(
    moneda: string,
): DataTableColumns<ImpuestoDocumentoFiscal> {
    return [
        {
            // Los tres campos llegan como string: el `accessorFn` los pasa a
            // número para que el orden sea el numérico y no el alfabético, que
            // pondría "5.00" después de "15.00".
            id: 'tarifa',
            accessorFn: (impuesto) => Number(impuesto.tarifa),
            header: 'Tarifa',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-semibold' },
            cell: ({ row }) => `${formatDecimal(row.original.tarifa, 2)} %`,
        },
        {
            id: 'base_gravada',
            accessorFn: (impuesto) => Number(impuesto.base_gravada),
            header: 'Base gravada',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => formatMoney(row.original.base_gravada, moneda),
        },
        {
            id: 'impuesto',
            accessorFn: (impuesto) => Number(impuesto.impuesto),
            header: 'Impuesto',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-extrabold' },
            cell: ({ row }) => formatMoney(row.original.impuesto, moneda),
        },
    ]
}

interface DocumentoFiscalImpuestosTableProps {
    documentoId: number
}

export function DocumentoFiscalImpuestosTable({
    documentoId,
}: DocumentoFiscalImpuestosTableProps) {
    const { documento } = useGetDetalleDocumentoFiscal({ documentoId })

    const columns = createColumns(documento.moneda)

    return (
        <DataTable
            data={documento.impuestos}
            columns={columns}
            defaultSorting={[{ id: 'tarifa', desc: false }]}
            maxHeight="32rem"
            emptyTitle="El documento no tiene impuestos"
            emptyDescription="Este documento fiscal se emitió sin tarifas de impuesto aplicadas."
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out"
        />
    )
}
