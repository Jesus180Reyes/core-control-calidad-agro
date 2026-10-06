import { cn } from '#/lib/utils'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'


const BADGE_STYLES =
    'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide'

export function QualityStatusBadge({ pesaje }: { pesaje: PesajeData }) {
    return (
        <span
            className={cn(
                BADGE_STYLES,
                pesaje.fuera_de_rango
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
            )}
            title={pesaje.estado_calidad_codigo}
        >
            {pesaje.estado_calidad}
        </span>
    )
}
