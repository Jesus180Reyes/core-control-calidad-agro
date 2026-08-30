import { cn } from '#/lib/utils'
import { PesajeRowActions } from '#/presentation/components/inspeccion-pesajes/PesajeRowActions'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatWeight } from '#/presentation/helpers/number/formatWeight'
import { useGetInspeccionPesajes } from '#/presentation/hooks/inspeccion-pesajes/useInspeccionPesajes'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

const BADGE_STYLES =
    'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide'

function Peso({ valor, destacado = false }: { valor: string; destacado?: boolean }) {
    return (
        <span
            className={cn(
                'tabular-nums',
                destacado ? 'font-extrabold text-text-main' : 'font-semibold',
            )}
        >
            {formatWeight(valor)}
        </span>
    )
}

function Dato({ valor }: { valor: string | null }) {
    if (!valor) return <span className="text-text-muted">—</span>

    return <>{valor}</>
}

function EstadoCalidad({ pesaje }: { pesaje: PesajeData }) {
    const fueraDeRango = pesaje.fuera_de_rango === 1

    return (
        <span
            className={cn(
                BADGE_STYLES,
                fueraDeRango
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            )}
            title={pesaje.estado_calidad_codigo}
        >
            {pesaje.estado_calidad}
        </span>
    )
}

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
            meta: { align: 'right' },
            cell: ({ row }) => <Peso valor={row.original.peso_bruto} />,
        },
        {
            accessorKey: 'tara',
            header: 'Tara',
            meta: { align: 'right' },
            cell: ({ row }) => <Peso valor={row.original.tara} />,
        },
        {
            accessorKey: 'peso_neto',
            header: 'Peso neto',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => <Peso valor={row.original.peso_neto} destacado />,
        },
        {
            accessorKey: 'estado_calidad',
            header: 'Estado',
            enableSorting: true,
            meta: { align: 'center' },
            cell: ({ row }) => <EstadoCalidad pesaje={row.original} />,
        },
        {
            accessorKey: 'fuera_de_rango',
            header: 'Peso fuera de rango',
            cell: ({ row }) => <Dato valor={row.original.fuera_de_rango ? 'Si' : 'No'} />,
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
}

export function PesajesInspectionView({ loteId }: PesajesInspectionViewProps) {
    const { pesajes } = useGetInspeccionPesajes({ loteId })

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
