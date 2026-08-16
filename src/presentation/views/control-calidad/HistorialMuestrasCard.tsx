import type { Muestra } from "#/presentation/types/control-calidad/control-calidad.types"

interface HistorialMuestrasProps {
    muestras: Muestra[]
    lote: string
}

export function HistorialMuestrasCard({ muestras, lote }: HistorialMuestrasProps) {
    return (
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    Últimas Muestras Lote {lote}
                </h3>
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition-colors cursor-pointer">
                    Ver todas
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </button>
            </div>

            <div className="space-y-2.5">
                {muestras.map((muestra) => (
                    <div
                        key={muestra.id}
                        className="flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/20 border border-slate-100/50 dark:border-zinc-900 rounded-xl p-3"
                    >
                        <div className="flex gap-4.5 text-xs text-slate-400 font-bold">
                            <span className="text-slate-500 font-extrabold">{muestra.id}</span>
                            <span>{muestra.hora}</span>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-sm font-extrabold text-[#111827] dark:text-zinc-200 font-mono">
                                {muestra.peso.toLocaleString()}{' '}
                                <span className="text-slate-400 font-semibold text-xs">g</span>
                            </span>

                            <span className="bg-[#E6F4EA] text-[#137333] dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full">
                                {muestra.estado}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}