
interface StateProps {
    pesoActual: number
    diferencia: number
    isStabilizing: boolean
}

export function EstadoEspera() {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 shadow-md">
                    <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 bg-slate-100 dark:bg-zinc-800 text-[10px] lg:text-xs font-black uppercase tracking-wider mb-8 lg:mb-12 text-slate-400 dark:text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Esperando Carga
            </div>

            <span className="text-[11px] lg:text-xs font-extrabold tracking-[0.15em] text-slate-400 dark:text-zinc-500 uppercase mb-3">
                Lectura Actual
            </span>
            <div className="flex items-baseline justify-center gap-3 mb-10 lg:mb-16 select-none">
                <h2 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight font-sans text-slate-600 dark:text-zinc-400 transition-all">
                    0
                </h2>
                <span className="text-xl lg:text-3xl font-bold text-slate-400 dark:text-zinc-500">g</span>
            </div>

            <div className="grid grid-cols-2 w-full border-t border-slate-100 dark:border-zinc-800/60 pt-8 mb-4">
                <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-zinc-800/60 pr-2">
                    <div className="w-1.5 h-8 lg:h-10 bg-slate-100 dark:bg-zinc-800 rounded-full relative mb-3">
                        <div className="w-3 h-3 rounded-full absolute left-1/2 -translate-x-1/2 bg-slate-400 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Desviación</span>
                    <span className="text-sm lg:text-base font-black mt-1 text-slate-500">0 g</span>
                </div>

                <div className="flex flex-col items-center justify-center pl-2">
                    <div className="mb-3 text-slate-400 dark:text-zinc-500">
                        <svg className="w-6 h-6 lg:w-8 lg:h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
                        </svg>
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Estado</span>
                    <span className="text-sm lg:text-base font-black text-slate-800 dark:text-zinc-300 mt-1 uppercase tracking-wide">Vacío</span>
                </div>
            </div>
        </div>
    )
}

export function EstadoDesviado({ pesoActual, diferencia, isStabilizing }: StateProps) {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none">
                    <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-amber-200 bg-amber-100 dark:bg-amber-950/30 text-[10px] lg:text-xs font-black uppercase tracking-wider mb-8 lg:mb-12 text-amber-700 dark:text-amber-500">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Desviado
            </div>

            <span className="text-[11px] lg:text-xs font-extrabold tracking-[0.15em] text-slate-400 dark:text-zinc-500 uppercase mb-3">
                Lectura Actual
            </span>
            <div className="flex items-baseline justify-center gap-3 mb-10 lg:mb-16 select-none">
                <h2 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight font-sans text-amber-600 dark:text-amber-500 transition-all">
                    {pesoActual.toLocaleString()}
                </h2>
                <span className="text-xl lg:text-3xl font-bold text-slate-400 dark:text-zinc-500">g</span>
            </div>

            <div className="grid grid-cols-2 w-full border-t border-slate-100 dark:border-zinc-800/60 pt-8 mb-4">
                <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-zinc-800/60 pr-2">
                    <div className="w-1.5 h-8 lg:h-10 bg-slate-100 dark:bg-zinc-800 rounded-full relative mb-3">
                        <div className="w-3 h-3 rounded-full absolute left-1/2 -translate-x-1/2 bg-amber-500 bottom-0" />
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Desviación</span>
                    <span className="text-sm lg:text-base font-black mt-1 text-amber-500">
                        +{diferencia.toFixed(0)} g
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center pl-2">
                    <div className="mb-3 text-slate-400 dark:text-zinc-500">
                        <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${!isStabilizing ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
                        </svg>
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Estado</span>
                    <span className="text-sm lg:text-base font-black text-slate-800 dark:text-zinc-300 mt-1 uppercase tracking-wide">
                        {isStabilizing ? 'Estabilizando' : 'Estable'}
                    </span>
                </div>
            </div>
        </div>
    )
}

export function EstadoAprobado({ pesoActual, diferencia, isStabilizing }: StateProps) {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
                <div className=" animate-pulse w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none">
                    <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-emerald-200 bg-emerald-100 dark:bg-emerald-950/30 text-[10px] lg:text-xs font-black uppercase tracking-wider mb-8 lg:mb-12 text-emerald-800 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Aprobado
            </div>

            <span className="text-[11px] lg:text-xs font-extrabold tracking-[0.15em] text-slate-400 dark:text-zinc-500 uppercase mb-3">
                Lectura Actual
            </span>
            <div className="flex items-baseline justify-center gap-3 mb-10 lg:mb-16 select-none">
                <h2 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight font-sans text-emerald-800 dark:text-emerald-500 transition-all">
                    {pesoActual.toLocaleString()}
                </h2>
                <span className="text-xl lg:text-3xl font-bold text-slate-400 dark:text-zinc-500">g</span>
            </div>

            <div className="grid grid-cols-2 w-full border-t border-slate-100 dark:border-zinc-800/60 pt-8 mb-4">
                <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-zinc-800/60 pr-2">
                    <div className="w-1.5 h-8 lg:h-10 bg-slate-100 dark:bg-zinc-800 rounded-full relative mb-3">
                        <div className="w-3 h-3 rounded-full absolute left-1/2 -translate-x-1/2 bg-emerald-500 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Desviación</span>
                    <span className="text-sm lg:text-base font-black mt-1 text-emerald-600">
                        {diferencia === 0 ? '0' : `${diferencia > 0 ? '+' : ''}${diferencia.toFixed(0)}`} g
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center pl-2">
                    <div className="mb-3 text-slate-400 dark:text-zinc-500">
                        <svg className={`w-6 h-6 lg:w-8 lg:h-8 ${!isStabilizing ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
                        </svg>
                    </div>
                    <span className="text-[10px] lg:text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">Estado</span>
                    <span className="text-sm lg:text-base font-black text-slate-800 dark:text-zinc-300 mt-1 uppercase tracking-wide">
                        {isStabilizing ? 'Estabilizando' : 'Estable'}
                    </span>
                </div>
            </div>
        </div>
    )
}