import { cn } from '#/lib/utils'
import { useHasMounted } from '#/presentation/hooks/shared/useHasMounted'
import { DEVIATION_SCALE_CAP, SUNKEN_TRACK_CLASS, TONE_FILL, deviationTone } from './metricsStyles'
import type { MetricTone } from './metricsStyles'

const TRACK_CLASS = cn('relative h-1.5 w-16 shrink-0 overflow-hidden', SUNKEN_TRACK_CLASS)

interface InlineBarProps {
    /** Porcentaje 0–100. Con `null`, la pista vacía. */
    value: number | null
    tone: MetricTone
}

/** Mini barra de 6 px para una celda de la tabla. */
export function InlineBar({ value, tone }: InlineBarProps) {
    const mounted = useHasMounted()
    const ancho = value === null ? 0 : Math.min(100, Math.max(0, value))

    return (
        <span aria-hidden className={TRACK_CLASS}>
            <span
                className={cn(
                    'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
                    TONE_FILL[tone],
                )}
                style={{ width: mounted ? `${ancho}%` : '0%' }}
            />
        </span>
    )
}

/**
 * La escala de las barras divergentes: el mayor |desviación| de las filas
 * visibles, con el mismo tope de ±50 del medidor.
 */
export function divergingScale(values: Array<number | null>): number {
    const maximo = Math.max(0, ...values.map((valor) => Math.abs(valor ?? 0)))
    return Math.min(DEVIATION_SCALE_CAP, maximo)
}

interface DivergingBarProps {
    value: number | null
    /** Sale de `divergingScale` sobre las filas visibles. */
    scale: number
}

/** Mini barra centrada en 0: crece a la derecha si es positiva, a la izquierda si no. */
export function DivergingBar({ value, scale }: DivergingBarProps) {
    const mounted = useHasMounted()

    const valor = value ?? 0
    const mitad = scale > 0 ? (Math.min(scale, Math.abs(valor)) / scale) * 50 : 0

    return (
        <span aria-hidden className={TRACK_CLASS}>
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-text-muted/30" />

            {value !== null && (
                <span
                    className={cn(
                        'absolute inset-y-0 rounded-full transition-[width] duration-500',
                        valor >= 0 ? 'left-1/2' : 'right-1/2',
                        TONE_FILL[deviationTone(value)],
                    )}
                    style={{ width: mounted ? `${mitad}%` : '0%' }}
                />
            )}
        </span>
    )
}
