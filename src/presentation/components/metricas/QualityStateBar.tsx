import { cn } from '#/lib/utils'
import { useHasMounted } from '#/presentation/hooks/shared/useHasMounted'
import type { QualityStateMetric } from '#/presentation/types/metricas/qualityMetrics.types'
import { EMPTY_VALUE, formatCount, formatPercent, toSentenceCase } from './metricsFormat'
import { SUNKEN_TRACK_CLASS, TONE_FILL, qualityStateTone } from './metricsStyles'

interface QualityStateBarProps {
    states: QualityStateMetric[]
}

/**
 * Barra segmentada de 12 px con un segmento por estado con pesajes, y una
 * leyenda con todos los estados del catálogo, también los que están en cero.
 * El ancho de cada segmento es el `porcentaje` del backend: acá no se divide.
 */
export function QualityStateBar({ states }: QualityStateBarProps) {
    const mounted = useHasMounted()

    return (
        <div>
            <div className={cn('flex h-3 gap-0.5 overflow-hidden p-0.5', SUNKEN_TRACK_CLASS)}>
                {states
                    .filter((estado) => estado.total > 0)
                    .map((estado) => (
                        <span
                            key={estado.estado_calidad_id}
                            aria-hidden
                            className={cn(
                                'h-full rounded-full transition-[width] duration-500',
                                TONE_FILL[qualityStateTone(estado.codigo)],
                            )}
                            style={{ width: mounted ? `${estado.porcentaje ?? 0}%` : '0%' }}
                        />
                    ))}
            </div>

            <ul className="mt-5 space-y-2.5">
                {states.map((estado) => (
                    <li
                        key={estado.estado_calidad_id}
                        className="flex items-center gap-3 text-sm"
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'size-2 shrink-0 rounded-full',
                                TONE_FILL[qualityStateTone(estado.codigo)],
                            )}
                        />

                        <span className="min-w-0 flex-1 truncate font-medium text-text-main">
                            {toSentenceCase(estado.nombre)}
                        </span>

                        <span className="w-12 text-right font-bold tabular-nums text-text-main">
                            {formatCount(estado.total)}
                        </span>

                        <span className="w-16 text-right text-xs font-medium tabular-nums text-text-muted">
                            {estado.porcentaje === null ? EMPTY_VALUE : `${formatPercent(estado.porcentaje)} %`}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
