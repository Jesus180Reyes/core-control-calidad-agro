import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface ClienteCardProps {
    cliente: Cliente
    onSeleccionar: (cliente: Cliente) => void
}

const PILL_BASE = 'flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider'

const PILL_ACTIVO = 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'

const PILL_INACTIVO = 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400'

export function ClienteCard({ cliente, onSeleccionar }: ClienteCardProps) {
    // `isActive` es el tinyint crudo de la tabla. Solo `1` cuenta como activo:
    // ante un `0` o un `null` se marca inactivo, que es la lectura conservadora.
    const estaActivo = cliente.isActive === 1

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

            <div className={`${PILL_BASE} ${estaActivo ? PILL_ACTIVO : PILL_INACTIVO} w-fit`}>
                <span className={`w-2 h-2 rounded-full ${estaActivo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {estaActivo ? 'Activo' : 'Inactivo'}
            </div>
        </button>
    )
}
