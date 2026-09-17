import { cn } from '@/lib/utils'
import { AppIcon } from '#/presentation/components/shared/AppIcon'

type LoadingSize = 'sm' | 'md' | 'lg'

interface LoadingStateProps {
    size?: LoadingSize
    className?: string
}

export function LoadingState({
    size = 'md',
    className = 'py-16',
}: LoadingStateProps) {
    return (
        <div

            role="status"
            aria-live="polite"
            aria-busy
            aria-label="Cargando"
            className={cn(
                'flex flex-col items-center justify-center gap-5',
                className,
            )}
        >
            <BrandSpinner size={size} />

        </div>
    )
}

const tamanios = {
    sm: { anillo: 'size-14', icono: 'size-9 rounded-xl', borde: 'border-2' },
    md: { anillo: 'size-20', icono: 'size-12', borde: 'border-[3px]' },
    lg: { anillo: 'size-24', icono: 'size-14 rounded-[20px]', borde: 'border-[3px]' },
} as const satisfies Record<LoadingSize, unknown>


/** El ícono de la app dentro del anillo que gira. */
function BrandSpinner({ size }: { size: LoadingSize }) {
    const tamanio = tamanios[size]

    return (
        <div className={cn('relative grid place-items-center', tamanio.anillo)}>
            <span
                aria-hidden
                className="absolute inset-2 animate-pulse rounded-full bg-brand/10 blur-md"
            />

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



