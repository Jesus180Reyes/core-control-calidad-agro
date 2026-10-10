import { Users } from 'lucide-react'
import { cn } from '#/lib/utils'
import { DivergingBar, InlineBar, divergingScale } from '#/presentation/components/metricas/InlineBars'
import {
    EMPTY_VALUE,
    formatCount,
    formatPercent,
    formatSignedPercent,
} from '#/presentation/components/metricas/metricsFormat'
import { METRIC_CARD_CLASS, metricCardDelay } from '#/presentation/components/metricas/metricsStyles'
import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { DataTable, type DataTableColumns } from '#/presentation/components/shared/table/DataTable'
import type { ClientQualityMetrics } from '#/presentation/types/metricas/qualityMetrics.types'

// Un `null` ordena último en descendente, que es el orden con el que se lee la tabla.
const SIN_DATO = Number.NEGATIVE_INFINITY

function PercentText({ value }: { value: number | null }) {
    if (value === null) return <span className="text-text-muted">{EMPTY_VALUE}</span>
    return <>{formatPercent(value)} %</>
}

function createColumns(escala: number): DataTableColumns<ClientQualityMetrics> {
    return [
        {
            id: 'cliente',
            accessorFn: (fila) => fila.cliente ?? `Cliente #${fila.cliente_id}`,
            header: 'Cliente',
            enableSorting: true,
            meta: { cellClassName: 'font-bold max-w-56 truncate' },
        },
        {
            accessorKey: 'total_pesajes',
            header: 'Pesajes',
            enableSorting: true,
            meta: { align: 'right', cellClassName: 'font-semibold' },
            cell: ({ row }) => formatCount(row.original.total_pesajes),
        },
        {
            id: 'porcentaje_fuera_de_rango',
            accessorFn: (fila) => fila.porcentaje_fuera_de_rango ?? SIN_DATO,
            header: 'Fuera de rango',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-end gap-3">
                    <InlineBar value={row.original.porcentaje_fuera_de_rango} tone="warning" />
                    <span className="w-16">
                        <PercentText value={row.original.porcentaje_fuera_de_rango} />
                    </span>
                </span>
            ),
        },
        {
            id: 'desviacion_promedio_pct',
            accessorFn: (fila) => fila.desviacion_promedio_pct ?? SIN_DATO,
            header: 'Desviación',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => {
                const desviacion = row.original.desviacion_promedio_pct

                return (
                    <span className="inline-flex items-center justify-end gap-3">
                        <DivergingBar value={desviacion} scale={escala} />
                        <span className="w-16">
                            {desviacion === null ? (
                                <span className="text-text-muted">{EMPTY_VALUE}</span>
                            ) : (
                                <>{formatSignedPercent(desviacion)} %</>
                            )}
                        </span>
                    </span>
                )
            },
        },
        {
            id: 'porcentaje_rechazo_aprobador',
            accessorFn: (fila) => fila.porcentaje_rechazo_aprobador ?? SIN_DATO,
            header: 'Rechazo aprob.',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => <PercentText value={row.original.porcentaje_rechazo_aprobador} />,
        },
        {
            accessorKey: 'anulados',
            header: 'Anulados',
            enableSorting: true,
            meta: { align: 'right' },
            cell: ({ row }) => formatCount(row.original.anulados),
        },
    ]
}

interface ClientMetricsTableProps {
    clients: ClientQualityMetrics[]
    /** Click en una fila: el tablero entero pasa a mostrar ese cliente. */
    onClientSelect: (clienteId: number) => void
    index?: number
}

export function ClientMetricsTable({ clients, onClientSelect, index = 0 }: ClientMetricsTableProps) {
    const columns = createColumns(divergingScale(clients.map((fila) => fila.desviacion_promedio_pct)))

    return (
        <section className={cn(METRIC_CARD_CLASS, 'overflow-hidden p-0 sm:p-0')} style={metricCardDelay(index)}>
            <SectionCardHeader
                title="Por cliente"
                icon={<Users className="size-5" strokeWidth={2.1} />}
                badge={`${formatCount(clients.length)} ${clients.length === 1 ? 'cliente' : 'clientes'}`}
            />

            <DataTable
                data={clients}
                columns={columns}
                getRowId={(fila) => String(fila.cliente_id)}
                onRowClick={(fila) => onClientSelect(fila.cliente_id)}
                defaultSorting={[{ id: 'total_pesajes', desc: true }]}
                maxHeight="28rem"
                emptyTitle="Sin clientes en este período"
                // Una tarjeta lleva una sola sombra: la tabla pierde su propio
                // marco y queda como el cuerpo de la tarjeta.
                className="rounded-none border-0 bg-transparent shadow-none before:hidden"
            />
        </section>
    )
}
