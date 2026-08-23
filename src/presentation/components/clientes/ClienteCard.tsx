import { Building2 } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

const SIN_DIRECCION = 'Sin dirección registrada'

const CARD_STYLES = cn(
    'w-full text-left bg-surface border border-border-ui/50 rounded-[28px] p-6',
    'shadow-clay-card space-y-5 cursor-pointer transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-900/50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
)

const ICON_STYLES = cn(
    'w-11 h-11 shrink-0 rounded-xl flex items-center justify-center',
    'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600',
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
                    <Building2 className="w-5 h-5" strokeWidth={2.2} />
                </span>

                <div className="min-w-0">
                    <p className="text-text-main font-extrabold truncate">
                        {cliente.nombre}
                    </p>
                    <p className="text-text-muted text-[11px] font-medium truncate">
                        {cliente.direccion_planta ?? SIN_DIRECCION}
                    </p>
                </div>
            </div>
        </button>
    )
}
