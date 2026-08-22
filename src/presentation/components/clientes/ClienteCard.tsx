import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface ClienteCardProps {
    cliente: Cliente
    onSeleccionar: (cliente: Cliente) => void
}


export function ClienteCard({ cliente, onSeleccionar }: ClienteCardProps) {

    return (
        <button
            type="button"
            onClick={() => onSeleccionar(cliente)}
            className="w-full text-left bg-surface border border-border-ui/50 rounded-[28px] p-6 shadow-clay-card space-y-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-900/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
            <div className="flex items-center gap-4">
                <span className="w-11 h-11 shrink-0 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </span>

                <div className="min-w-0">
                    <p className="text-text-main font-extrabold truncate">
                        {cliente.nombre}
                    </p>
                    <p className="text-text-muted text-[11px] font-medium truncate">
                        {cliente.direccion_planta ?? 'Sin dirección registrada'}
                    </p>
                </div>
            </div>

        </button>
    )
}
