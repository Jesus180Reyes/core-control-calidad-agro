import { cn } from '@/lib/utils'
import { AppIcon } from '#/presentation/components/shared/AppIcon'

type LoadingSize = 'sm' | 'md' | 'lg'

interface LoadingStateProps {
    /** Qué se está cargando. Se anuncia por `aria-live` y se pinta bajo el ícono. */
    label?: string
    size?: LoadingSize
    className?: string
}

export function LoadingState({
    label,
    size = 'md',
    className = 'py-16',
}: LoadingStateProps) {
    return (
        <div
            // `polite` y no `assertive`: la carga no interrumpe lo que el lector
            // de pantalla esté leyendo. `aria-busy` marca la región como
            // incompleta mientras dura.
            role="status"
            aria-live="polite"
            aria-busy
            className={cn(
                'flex flex-col items-center justify-center gap-5',
                className,
            )}
        >
            <BrandSpinner size={size} />

            {label && <LoadingLabel label={label} />}
        </div>
    )
}

/**
 * Cada tamaño es un juego cerrado: el anillo, la placa de la marca y el grosor
 * del borde tienen que moverse juntos o el ícono queda pegado al borde que gira.
 */
const tamanios = {
    sm: { anillo: 'size-14', icono: 'size-9 rounded-xl', borde: 'border-2' },
    md: { anillo: 'size-20', icono: 'size-12', borde: 'border-[3px]' },
    lg: { anillo: 'size-24', icono: 'size-14 rounded-[20px]', borde: 'border-[3px]' },
} as const satisfies Record<LoadingSize, unknown>

/** Los tres puntos que laten junto al texto, desfasados para que hagan onda. */
const puntos = [{ retraso: '0ms' }, { retraso: '180ms' }, { retraso: '360ms' }]

/** El ícono de la app dentro del anillo que gira. */
function BrandSpinner({ size }: { size: LoadingSize }) {
    const tamanio = tamanios[size]

    return (
        <div className={cn('relative grid place-items-center', tamanio.anillo)}>
            {/* El halo late detrás de la placa: es lo que da la sensación de
                pulso incluso cuando el anillo queda quieto. */}
            <span
                aria-hidden
                className="absolute inset-2 animate-pulse rounded-full bg-brand/10 blur-md"
            />

            {/* El anillo: casi todo el borde apagado y sólo el tramo de arriba
                con el color de marca, que es lo que se ve girar. */}
            <span
                aria-hidden
                className={cn(
                    'absolute inset-0 animate-spin rounded-full border-border-ui border-t-brand',
                    tamanio.borde,
                )}
            />

            <AppIcon className={tamanio.icono} />
        </div>
    )
}

/** Los tres puntos animados que siguen al texto. */
function BouncingDots() {
    return (
        <span aria-hidden className="flex items-end gap-1 pb-0.5">
            {puntos.map((punto) => (
                <span
                    key={punto.retraso}
                    style={{ animationDelay: punto.retraso }}
                    className="size-1 animate-bounce rounded-full bg-brand/60"
                />
            ))}
        </span>
    )
}

function LoadingLabel({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2">
            {/* Los puntos suspensivos del texto se caen: ese trabajo lo hacen
                los tres puntos animados de al lado, y escritos también quedaban
                seis. */}
            <p className="text-sm font-semibold text-text-main">
                {label.replace(/\.{3}$/, '')}
            </p>

            <BouncingDots />
        </div>
    )
}
