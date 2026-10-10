import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { cn } from '#/lib/utils'
import type { PeriodPreset } from '#/presentation/hooks/metricas/qualityMetricsParams'
import { SUNKEN_TRACK_CLASS } from './metricsStyles'

export const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
    { value: 'month', label: 'Este mes' },
    { value: 'custom', label: 'Personalizado' },
]

interface PeriodChipsProps {
    value: PeriodPreset
    onChange: (value: PeriodPreset) => void
}

/**
 * Control segmentado de los presets de período, sobre una pista hundida. Es un
 * `radiogroup`: Tab entra al chip activo y las flechas mueven y eligen. En el
 * teléfono hace scroll horizontal sin barra visible.
 */
export function PeriodChips({ value, onChange }: PeriodChipsProps) {
    const botones = useRef<Array<HTMLButtonElement | null>>([])

    const moverA = (indice: number) => {
        const total = PERIOD_OPTIONS.length
        const destino = (indice + total) % total
        onChange(PERIOD_OPTIONS[destino].value)
        botones.current[destino]?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, indice: number) => {
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault()
                moverA(indice + 1)
                break
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault()
                moverA(indice - 1)
                break
            case 'Home':
                event.preventDefault()
                moverA(0)
                break
            case 'End':
                event.preventDefault()
                moverA(PERIOD_OPTIONS.length - 1)
                break
        }
    }

    return (
        <div className="-mx-1 max-w-full overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
                role="radiogroup"
                aria-label="Período"
                className={cn('inline-flex gap-1 p-1', SUNKEN_TRACK_CLASS)}
            >
                {PERIOD_OPTIONS.map((opcion, indice) => {
                    const activo = opcion.value === value

                    return (
                        <button
                            key={opcion.value}
                            ref={(boton) => {
                                botones.current[indice] = boton
                            }}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            tabIndex={activo ? 0 : -1}
                            onClick={() => onChange(opcion.value)}
                            onKeyDown={(event) => handleKeyDown(event, indice)}
                            className={cn(
                                'shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors',
                                'outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
                                activo
                                    ? 'bg-surface text-brand shadow-clay-btn'
                                    : 'text-text-muted hover:text-text-main',
                            )}
                        >
                            {opcion.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
