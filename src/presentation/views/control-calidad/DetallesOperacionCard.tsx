import type { OperacionData } from "#/presentation/types/control-calidad/control-calidad.types"

interface DetallesOperacionProps {
    operacion: OperacionData
}

export function DetallesOperacionCard({ operacion }: DetallesOperacionProps) {
    return (
        <div className="animate-pulse bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Detalles de Operación</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Monitoreo en tiempo real</p>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-semibold">Cliente</span>
                    <span className="text-indigo-950 dark:text-white font-extrabold">{operacion.cliente}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-semibold">Etapa</span>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                        <span className="text-indigo-950 dark:text-white font-extrabold">{operacion.etapa}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-semibold">Lote</span>
                    <span className="text-indigo-950 dark:text-white font-extrabold bg-slate-50 dark:bg-zinc-800 px-3 py-1 rounded-lg">
                        {operacion.lote}
                    </span>
                </div>
            </div>
        </div>
    )
}