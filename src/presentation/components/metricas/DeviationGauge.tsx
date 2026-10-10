import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '#/lib/utils'
import { formatCount } from './metricsFormat'
import {
    DEVIATION_SCALE_CAP,
    SUNKEN_TRACK_CLASS,
    TONE_BAND,
    TONE_FILL,
    TONE_TEXT,
    deviationTone,
} from './metricsStyles'
import type { MetricTone } from './metricsStyles'

// Por debajo de este |μ| la frase dice "En el ideal".
const UMBRAL_IDEAL = 0.5

interface DeviationGaugeProps {
    /** μ: desviación promedio frente al ideal, en %, con signo. */
    mean: number | null
    /** σ: desviación estándar, en %. */
    std: number | null
}

/** Escala simétrica: ±max(5, ceil((|μ| + σ) / 5) × 5), con tope en ±50. */
function deviationScale(mean: number, std: number): number {
    const alcance = Math.ceil((Math.abs(mean) + std) / 5) * 5
    return Math.min(DEVIATION_SCALE_CAP, Math.max(5, alcance))
}

function phrase(mean: number | null): { text: string; tone: MetricTone } {
    if (mean === null) return { text: 'Sin datos para calcular la desviación', tone: 'neutral' }
    if (Math.abs(mean) < UMBRAL_IDEAL) return { text: 'En el ideal', tone: 'brand' }
    if (mean > 0) return { text: 'Por encima del ideal', tone: 'warning' }
    return { text: 'Por debajo del ideal', tone: 'destructive' }
}

/**
 * Pista horizontal centrada en 0, con una banda translúcida para μ ± σ y un
 * marcador en μ. Si μ se pasa del tope, el marcador queda en el borde con una
 * flecha: el número de arriba sigue mostrando el valor real.
 */
export function DeviationGauge({ mean, std }: DeviationGaugeProps) {
    const { text, tone: phraseTone } = phrase(mean)
    const tone = deviationTone(mean)

    const sigma = std ?? 0
    const escala = mean === null ? 15 : deviationScale(mean, sigma)

    // Posición en % del ancho de la pista, recortada a la escala.
    const posicion = (valor: number) =>
        ((Math.min(escala, Math.max(-escala, valor)) + escala) / (2 * escala)) * 100

    const desborde = mean !== null && Math.abs(mean) > escala ? Math.sign(mean) : 0

    return (
        <div>
            <div className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-right text-[10px] font-semibold tabular-nums text-text-muted">
                    {'−'}
                    {formatCount(escala)}
                </span>

                <div className={cn('relative h-3 flex-1', SUNKEN_TRACK_CLASS)}>
                    {/* El cero: la referencia del medidor, no una cuadrícula. */}
                    <span
                        aria-hidden
                        className="absolute inset-y-0.5 left-1/2 w-px -translate-x-1/2 bg-text-muted/30"
                    />

                    {mean !== null && sigma > 0 && (
                        <span
                            aria-hidden
                            className={cn(
                                'absolute inset-y-0 rounded-full transition-[left,width] duration-500',
                                TONE_BAND[tone],
                            )}
                            style={{
                                left: `${posicion(mean - sigma)}%`,
                                width: `${posicion(mean + sigma) - posicion(mean - sigma)}%`,
                            }}
                        />
                    )}

                    {mean !== null && (
                        <span
                            aria-hidden
                            className={cn(
                                'absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-surface ring-2 ring-surface transition-[left] duration-500',
                                desborde === 0 ? 'size-4' : 'size-5',
                                TONE_FILL[tone],
                            )}
                            style={{ left: `${posicion(mean)}%` }}
                        >
                            {desborde > 0 && <ChevronRight className="size-3.5" strokeWidth={3} />}
                            {desborde < 0 && <ChevronLeft className="size-3.5" strokeWidth={3} />}
                        </span>
                    )}
                </div>

                <span className="w-8 shrink-0 text-[10px] font-semibold tabular-nums text-text-muted">
                    +{formatCount(escala)}
                </span>
            </div>

            <p className={cn('mt-4 text-xs font-semibold', TONE_TEXT[phraseTone])}>{text}</p>
        </div>
    )
}
