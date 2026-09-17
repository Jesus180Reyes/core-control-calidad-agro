import { cn } from '@/lib/utils'

interface AppIconProps {
    /** Tamaño de la placa (`size-12` por defecto). */
    className?: string
}

/**
 * La marca de la app: la placa con el ícono de la báscula, igual a la del
 * login. Es lo que hace que una pantalla a medio cargar siga siendo la app y no
 * una página en blanco con un spinner.
 */
export function AppIcon({ className }: AppIconProps) {
    return (
        <div
            className={cn(
                'grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-clay-btn',
                className,
            )}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                // La mitad de la placa, sin importar el tamaño que le pasen.
                className="size-[50%]"
            >
                <path d="M12 3v17M19 9l-7-6-7 6M5 19h14" />
            </svg>
        </div>
    )
}
