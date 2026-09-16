import { EmptyValue } from '#/presentation/components/documentos-fiscales/DocumentoFiscalCells'
import { DocumentoFiscalRowActions } from '#/presentation/components/documentos-fiscales/DocumentoFiscalRowActions'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatDecimal } from '#/presentation/helpers/number/formatDecimal'
import { formatMoney } from '#/presentation/helpers/number/formatMoney'
import { useGetDocumentosFiscales } from '#/presentation/hooks/documentos-fiscales/useGetDocumentosFiscales'
import type { FiltrosDocumentosFiscales } from '#/presentation/schema/documentos-fiscales/filtrosDocumentosFiscalesSchema'
import type { Documento } from '#/presentation/types/documentos-fiscales/documentos-fiscales-response'

function crearColumnas(): DataTableColumns<Documento> {
    return [
        {
            id: 'acciones',
            header: 'Acciones',
            meta: { align: 'center', cellClassName: 'py-2' },
            cell: ({ row }) => <DocumentoFiscalRowActions documento={row.original} />,
        },
        {
            accessorKey: 'id',
            header: 'ID',
            enableSorting: true,
            meta: { align: 'right' },
        },
        {
            accessorKey: 'numero_completo',
            header: 'N. de Documento',
            enableSorting: true,
            meta: { cellClassName: 'font-bold whitespace-nowrap' },
        },
        {
            accessorKey: 'tipo_documento',
            header: 'Tipo de documento',
            enableSorting: true,
        },
        {
            accessorKey: 'fecha_emision',
            header: 'Emisión',
            enableSorting: true,
            meta: { cellClassName: 'whitespace-nowrap' },
            cell: ({ row }) => formatDate(row.original.fecha_emision),
        },
        {
            accessorKey: 'cliente',
            header: 'Documento de identificación del cliente',
            enableSorting: true,
        },
        {
            accessorKey: 'cliente_rtn',
            header: 'RTN del cliente',
            enableSorting: true,
        },
        {
            accessorKey: 'pais',
            header: 'País',
            enableSorting: true,
        },
        {
            accessorKey: 'pais_destino',
            header: 'País destino',
            cell: ({ row }) => <EmptyValue valor={row.original.pais_destino} />,
        },
        {
            accessorKey: 'moneda',
            header: 'Moneda',
            enableSorting: true,
            meta: { align: 'center', cellClassName: 'font-semibold' },
        },
        {
            accessorKey: 'tipo_cambio',
            header: 'Tipo de cambio',
            meta: { align: 'right' },
            cell: ({ row }) => formatDecimal(row.original.tipo_cambio),
        },
        {
            accessorKey: 'importe_exento',
            header: 'Exento',
            meta: { align: 'right' },
            cell: ({ row }) => formatMoney(row.original.importe_exento),
        },
        {
            accessorKey: 'importe_exonerado',
            header: 'Exonerado',
            meta: { align: 'right' },
            cell: ({ row }) => formatMoney(row.original.importe_exonerado),
        },
        {
            accessorKey: 'total',
            header: 'Total',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-extrabold' },
            cell: ({ row }) =>
                formatMoney(row.original.total, row.original.moneda),
        },
        {
            accessorKey: 'autorizacion',
            header: 'N. Autorización',
            meta: { cellClassName: 'whitespace-nowrap' },
            cell: ({ row }) => <EmptyValue valor={row.original.autorizacion} />,
        },
        {
            accessorKey: 'referencia_exencion',
            header: 'Ref. exención',
            cell: ({ row }) => (
                <EmptyValue valor={row.original.referencia_exencion} />
            ),
        },
    ]
}

interface DocumentosFiscalesViewProps {
    filtros: FiltrosDocumentosFiscales
}

export function DocumentosFiscalesView({ filtros }: DocumentosFiscalesViewProps) {
    const { documentos } = useGetDocumentosFiscales(filtros)

    const columns = crearColumnas()

    return (
        <DataTable
            data={documentos}
            columns={columns}
            getRowId={(documento) => String(documento.id)}
            defaultSorting={[{ id: 'fecha_emision', desc: true }]}
            maxHeight="32rem"
            emptyTitle="No hay documentos fiscales"
            emptyDescription="Todavía no se emitió ningún documento fiscal."
        />
    )
}
