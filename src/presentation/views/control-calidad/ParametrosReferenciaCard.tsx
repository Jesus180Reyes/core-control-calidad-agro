import type { ParametrosData } from "#/presentation/types/control-calidad/control-calidad.types"
interface ParametrosReferenciaProps {
    parametros: ParametrosData
    pesoActual: number
}

export function ParametrosReferenciaCard({ parametros, pesoActual }: ParametrosReferenciaProps) {
    const min = Number(parametros.minimo) || 0
    const max = Number(parametros.maximo) || 0
    const ideal = Number(parametros.ideal) || 0
    const currentWeight = Number(pesoActual) || 0

    const range = max - min
    const delta = currentWeight - min

    const positionPercentage = range > 0
        ? Math.max(0, Math.min(100, (delta / range) * 100))
        : 0

    const isUnderMin = currentWeight < min
    const isOverMax = currentWeight > max

    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-6">
            <h3 className="text-xs font-bold text-indigo-500/80 uppercase tracking-wider">
                Parámetros de Referencia
            </h3>

            <ReferenceValuesGrid min={min} ideal={ideal} max={max} unidad={parametros.unidad} />

            <WeightProgressBar
                percentage={positionPercentage}
                isUnderMin={isUnderMin}
                isOverMax={isOverMax}
            />
        </div>
    )
}
interface ReferenceValuesGridProps {
    min: number
    ideal: number
    max: number
    /** `unidad_medida` del lote; llega del API en mayúsculas ("LIBRAS"). */
    unidad: string
}

export function ReferenceValuesGrid({ min, ideal, max, unidad }: ReferenceValuesGridProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50/50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Mínimo</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {min.toLocaleString()}<span className="text-slate-400 font-normal text-xs ml-0.5 lowercase">{unidad}</span>
                </p>
            </div>

            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border-2 border-indigo-500/10 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">Ideal</p>
                <p className="text-sm font-extrabold text-indigo-600 mt-0.5">
                    {ideal.toLocaleString()}<span className="text-indigo-400 font-normal text-xs ml-0.5 lowercase">{unidad}</span>
                </p>
            </div>

            <div className="bg-slate-50/50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-2xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Máximo</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {max.toLocaleString()}<span className="text-slate-400 font-normal text-xs ml-0.5 lowercase">{unidad}</span>
                </p>
            </div>
        </div>
    )
}

interface WeightProgressBarProps {
    percentage: number
    isUnderMin: boolean
    isOverMax: boolean
}

export function WeightProgressBar({ percentage, isUnderMin, isOverMax }: WeightProgressBarProps) {
    return (
        <div className="space-y-3">
            <div className="relative w-full h-8 bg-[#E2E8F0]/40 dark:bg-zinc-800/60 rounded-full flex items-center">

                <div className="mx-auto w-[40%] h-full bg-[#C3DAFE]/40 dark:bg-indigo-950/40 border-l border-r border-[#A3BFFA]"></div>

                <div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center select-none pointer-events-none"
                    style={{
                        left: `${percentage}%`,
                        transform: 'translate(-50%, -50%)',
                        transition: 'left 120ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <div className="absolute w-4 h-4 bg-indigo-500/30 rounded-full blur-sm"></div>

                    <div className="w-4 h-4 bg-indigo-500 border-[3px] border-white dark:border-zinc-900 rounded-full shadow-md"></div>
                </div>
            </div>

            <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase px-1">
                <span className={isUnderMin ? "text-amber-500 transition-colors" : ""}>- INF</span>
                <span className="text-indigo-500/80 tracking-widest">Rango Tolerable</span>
                <span className={isOverMax ? "text-amber-500 transition-colors" : ""}>+ SUP</span>
            </div>
        </div>
    )
}




