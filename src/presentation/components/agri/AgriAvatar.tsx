import { Sparkles } from 'lucide-react'

import { cn } from '#/lib/utils'

/**
 * Las dos medidas en que se usa el avatar: la chica en la burbuja, el header y
 * el Sidebar; la grande, sólo en la bienvenida.
 */
const MEDIDAS = {
    sm: { caja: 'size-8 rounded-xl', icono: 'size-4' },
    lg: { caja: 'size-14 rounded-2xl', icono: 'size-7' },
} as const

interface AgriAvatarProps {
    /** @default 'sm' */
    size?: keyof typeof MEDIDAS
    className?: string
}

/**
 * La marca de Agri: el cuadrado con el gradiente propio del chat IA.
 *
 * Es el único lugar de la app donde viven `agri-from` y `agri-to` además del
 * botón de enviar: si el gradiente cambia, cambia acá.
 */
export function AgriAvatar({ size = 'sm', className }: AgriAvatarProps) {
    const medida = MEDIDAS[size]

    return (
        <span
            aria-hidden
            className={cn(
                'shrink-0 grid place-items-center text-white',
                'bg-linear-to-br from-agri-from to-agri-to',
                // El anillo interior es lo que despega el cuadrado del fondo en
                // modo oscuro, donde el gradiente y la superficie se acercan.
                'ring-1 ring-inset ring-white/25 shadow-clay-btn',
                medida.caja,
                className,
            )}
        >
            <Sparkles className={medida.icono} strokeWidth={2.2} />
        </span>
    )
}
