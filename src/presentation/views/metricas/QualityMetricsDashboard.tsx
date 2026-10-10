import type { ReactNode } from 'react'
import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '#/lib/utils'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { DeviationGauge } from '#/presentation/components/metricas/DeviationGauge'
import { DeviationHelpDialog } from '#/presentation/components/metricas/DeviationHelpDialog'
import { IndicatorCard } from '#/presentation/components/metricas/IndicatorCard'
import {
    EMPTY_VALUE,
    formatCount,
    formatPercent,
    formatSignedPercent,
} from '#/presentation/components/metricas/metricsFormat'
import {
    METRIC_CARD_CLASS,
    METRIC_LABEL_CLASS,
    METRIC_SUPPORT_CLASS,
    METRIC_UNIT_CLASS,
    METRIC_VALUE_CLASS,
    TONE_TEXT,
    deviationTone,
    metricCardDelay,
} from '#/presentation/components/metricas/metricsStyles'
import { QualityStateBar } from '#/presentation/components/metricas/QualityStateBar'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import type { QualityMetricsFilters } from '#/presentation/hooks/metricas/qualityMetricsParams'
import { useQualityMetrics } from '#/presentation/hooks/metricas/useQualityMetrics'
import type { QualityMetrics } from '#/presentation/types/metricas/qualityMetrics.types'
import { ClientMetricsTable } from './ClientMetricsTable'

// `parse` y no `new Date('YYYY-MM-DD')`: ese lo toma como UTC y, al oeste de
// Greenwich, corre el día hacia atrás.
function parseLocalDate(fecha: string): Date {
    return parse(fecha, 'yyyy-MM-dd', new Date())
}

/** "Del 11 sep al 10 oct de 2026"; el año del inicio sólo si difiere. */
function formatPeriod({ desde, hasta }: QualityMetrics['periodo']): string {
    const inicio = parseLocalDate(desde)
    const fin = parseLocalDate(hasta)
    const mismoAnio = inicio.getFullYear() === fin.getFullYear()

    const textoInicio = format(inicio, mismoAnio ? 'd MMM' : "d MMM 'de' yyyy", { locale: es })
    const textoFin = format(fin, "d MMM 'de' yyyy", { locale: es })

    return `Del ${textoInicio} al ${textoFin}`
}

function plural(cantidad: number, uno: string, otros: string): string {
    return `${formatCount(cantidad)} ${cantidad === 1 ? uno : otros}`
}

interface QualityMetricsDashboardProps {
    filters: QualityMetricsFilters
    /**
     * La barra de filtros. Se pinta entre el header y las tarjetas, pero la
     * crea la ruta: el fallback del `ErrorBoundary` también la pinta, así un
     * error no deja al usuario sin poder corregir el filtro que lo causó.
     */
    filterBar: ReactNode
    /** Un cambio de filtro en curso: el tablero anterior queda atenuado. */
    isPending: boolean
    onClientSelect: (clienteId: number) => void
}

export function QualityMetricsDashboard({
    filters,
    filterBar,
    isPending,
    onClientSelect,
}: QualityMetricsDashboardProps) {
    const metricas = useQualityMetrics(filters)
    const { resumen } = metricas

    const sinPesajes = resumen.total_pesajes === 0 && resumen.anulados === 0
    const desviacion = resumen.desviacion_promedio_pct
    const dispersion = resumen.desviacion_estandar_pct

    return (
        <div className="space-y-5">
            {/* El período sale siempre de la respuesta, nunca del navegador:
                así no puede contradecir lo que calculó el backend. */}
            <ClientesHeader titulo="Métricas de calidad" descripcion={formatPeriod(metricas.periodo)} />

            {filterBar}

            <div
                aria-busy={isPending}
                className={cn('space-y-5 transition-opacity duration-200', isPending && 'opacity-60')}
            >
                {sinPesajes ? (
                    <EmptyState
                        title="Sin pesajes en este período"
                        description="Probá con un período más largo o quitá alguno de los filtros."
                    />
                ) : (
                    <>
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <IndicatorCard
                                index={0}
                                label="Pesajes"
                                value={resumen.total_pesajes}
                                format="count"
                                support={`${plural(resumen.anulados, 'anulado', 'anulados')} · ${formatCount(resumen.sin_revisar)} sin revisar`}
                            />
                            <IndicatorCard
                                index={1}
                                label="Fuera de rango"
                                value={resumen.porcentaje_fuera_de_rango}
                                format="percent"
                                tone="warning"
                                support={`${formatCount(resumen.fuera_de_rango)} de ${formatCount(resumen.total_pesajes)}`}
                            />
                            <IndicatorCard
                                index={2}
                                label="Rechazo del aprobador"
                                value={resumen.porcentaje_rechazo_aprobador}
                                format="percent"
                                tone="destructive"
                                support={`${plural(resumen.aprobados_por_aprobador, 'aprobado', 'aprobados')} · ${plural(resumen.rechazados_por_aprobador, 'rechazado', 'rechazados')}`}
                            />
                            <IndicatorCard
                                index={3}
                                label="Anulación"
                                value={resumen.porcentaje_anulacion}
                                format="percent"
                                tone="neutral"
                                // `total_pesajes` no cuenta los anulados: la base
                                // del porcentaje es la suma de los dos.
                                support={`${formatCount(resumen.anulados)} de ${formatCount(resumen.total_pesajes + resumen.anulados)}`}
                            />
                        </div>

                        <div className="grid gap-5 lg:grid-cols-5">
                            <section
                                className={cn(METRIC_CARD_CLASS, 'lg:col-span-3')}
                                style={metricCardDelay(4)}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className={METRIC_LABEL_CLASS}>Desviación frente al ideal</h3>
                                    <DeviationHelpDialog />
                                </div>

                                <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                    <p
                                        className={cn(
                                            METRIC_VALUE_CLASS,
                                            TONE_TEXT[deviationTone(desviacion)],
                                            desviacion === 0 && 'text-text-main',
                                        )}
                                    >
                                        {desviacion === null ? EMPTY_VALUE : formatSignedPercent(desviacion)}
                                        {desviacion !== null && <span className={METRIC_UNIT_CLASS}>%</span>}
                                    </p>

                                    {dispersion !== null && (
                                        <p className={METRIC_SUPPORT_CLASS}>
                                            ± {formatPercent(dispersion)} % de dispersión
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <DeviationGauge mean={desviacion} std={dispersion} />
                                </div>
                            </section>

                            <section
                                className={cn(METRIC_CARD_CLASS, 'lg:col-span-2')}
                                style={metricCardDelay(5)}
                            >
                                <h3 className={METRIC_LABEL_CLASS}>Estados de calidad</h3>

                                <div className="mt-5">
                                    <QualityStateBar states={metricas.por_estado_calidad} />
                                </div>
                            </section>
                        </div>

                        <ClientMetricsTable
                            index={6}
                            clients={metricas.por_cliente}
                            onClientSelect={onClientSelect}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
