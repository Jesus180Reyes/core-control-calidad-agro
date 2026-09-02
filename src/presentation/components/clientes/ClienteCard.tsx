import { Building2, ChevronRight, MapPin, Package } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

const SIN_DIRECCION = 'Sin dirección registrada'

const CARD_STYLES = cn(
    'relative w-full overflow-hidden text-left cursor-pointer',
    'rounded-3xl border border-border-ui bg-surface p-5',
    'shadow-clay-card transition-[background-color,border-color] duration-150 ease-out',
    'hover:border-brand/40 hover:bg-muted/50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
)

const ICON_STYLES = cn(
    'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
    'bg-gradient-to-br from-brand to-indigo-400 text-white dark:to-indigo-600',
    'shadow-lg shadow-brand/25',
)

const CHEVRON_STYLES = 'ml-auto h-5 w-5 shrink-0 text-text-muted/60'

const BADGE_STYLES = cn(
    'inline-flex max-w-full items-center gap-1.5 rounded-full',
    'border border-border-ui bg-bg-app px-2.5 py-1',
    'text-[11px] font-semibold text-text-muted',
)

interface ClienteCardProps {
    cliente: Cliente
    onSeleccionar: (cliente: Cliente) => void
}

export function ClienteCard({ cliente, onSeleccionar }: ClienteCardProps) {
    return (
        <button type="button" onClick={() => onSeleccionar(cliente)} className={CARD_STYLES}>
            <div className="flex items-center gap-4">
                <span className={ICON_STYLES}>
                    <Building2 className="h-5 w-5" strokeWidth={2.2} />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold tracking-tight text-text-main">
                        {cliente.nombre}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-text-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                        <span className="truncate text-[11px] font-medium">
                            {cliente.direccion_planta ?? SIN_DIRECCION}
                        </span>
                    </p>
                </div>

                <ChevronRight className={CHEVRON_STYLES} strokeWidth={2.5} />
            </div>

            {cliente.producto && (
                <div className="mt-4 flex items-center gap-2 border-t border-border-ui pt-4">
                    <span className={BADGE_STYLES}>
                        <Package className="h-3 w-3 shrink-0" strokeWidth={2.4} />
                        <span className="truncate">{cliente.producto}</span>
                    </span>
                </div>
            )}
        </button>
    )
}
