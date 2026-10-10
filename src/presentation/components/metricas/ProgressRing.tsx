import { cn } from '#/lib/utils'
import { useHasMounted } from '#/presentation/hooks/shared/useHasMounted'
import { EMPTY_VALUE } from './metricsFormat'
import { TONE_STROKE } from './metricsStyles'
import type { MetricTone } from './metricsStyles'

const SIZE = 88
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface ProgressRingProps {
    /** Porcentaje 0–100. Con `null`, pista vacía y "—" en el centro. */
    value: number | null
    tone: MetricTone
    label: string
}

/**
 * Anillo de 88 px con trazo de 8. La pista se hunde con el inset aplicado al
 * contenedor redondo; el arco arranca vacío y se llena al montar.
 */
export function ProgressRing({ value, tone, label }: ProgressRingProps) {
    const mounted = useHasMounted()

    const porcentaje = value === null ? 0 : Math.min(100, Math.max(0, value))
    const offset = mounted ? CIRCUMFERENCE * (1 - porcentaje / 100) : CIRCUMFERENCE

    return (
        <div
            role="img"
            aria-label={label}
            className="relative grid size-[88px] shrink-0 place-items-center rounded-full shadow-clay-inset"
        >
            <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="absolute inset-0 -rotate-90"
                aria-hidden
            >
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE}
                    className="text-bg-app"
                />

                {/* Sin arco en cero: el remate redondo dibujaría un punto. */}
                {porcentaje > 0 && (
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={offset}
                        className={cn(
                            'transition-[stroke-dashoffset] duration-700 ease-out',
                            TONE_STROKE[tone],
                        )}
                    />
                )}
            </svg>

            {value === null && (
                <span aria-hidden className="relative text-sm font-bold text-text-muted">
                    {EMPTY_VALUE}
                </span>
            )}
        </div>
    )
}
