import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'
import { EMPTY_VALUE, formatCount, formatPercent } from './metricsFormat'
import {
    METRIC_CARD_CLASS,
    METRIC_LABEL_CLASS,
    METRIC_SUPPORT_CLASS,
    METRIC_UNIT_CLASS,
    METRIC_VALUE_CLASS,
    metricCardDelay,
} from './metricsStyles'
import type { MetricTone } from './metricsStyles'
import { ProgressRing } from './ProgressRing'

interface IndicatorCardProps {
    label: string
    value: number | null
    /** `count` es el número grande solo; `percent` lleva el anillo al lado. */
    format: 'count' | 'percent'
    /** Color del anillo. Sólo aplica con `format="percent"`. */
    tone?: MetricTone
    support?: ReactNode
    /** Posición en la grilla, para escalonar la entrada. */
    index?: number
}

export function IndicatorCard({
    label,
    value,
    format,
    tone = 'neutral',
    support,
    index = 0,
}: IndicatorCardProps) {
    const esPorcentaje = format === 'percent'
    const texto =
        value === null ? EMPTY_VALUE : esPorcentaje ? formatPercent(value) : formatCount(value)

    return (
        <article className={METRIC_CARD_CLASS} style={metricCardDelay(index)}>
            <h3 className={METRIC_LABEL_CLASS}>{label}</h3>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                {esPorcentaje && (
                    <ProgressRing
                        value={value}
                        tone={tone}
                        label={`${label}: ${value === null ? 'sin datos' : `${texto} %`}`}
                    />
                )}

                <p className={cn(METRIC_VALUE_CLASS, value === null && 'text-text-muted')}>
                    {texto}
                    {esPorcentaje && value !== null && <span className={METRIC_UNIT_CLASS}>%</span>}
                </p>
            </div>

            {support && <p className={cn('mt-4', METRIC_SUPPORT_CLASS)}>{support}</p>}
        </article>
    )
}
