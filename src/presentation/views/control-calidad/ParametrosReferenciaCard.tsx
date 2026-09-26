import { useState } from "react"
import { Target } from "lucide-react"
import type { ParametrosData } from "#/presentation/types/control-calidad/control-calidad.types"

interface ParametrosReferenciaProps {
    parametros: ParametrosData
    pesoActual: number
}

type WeightStatus = 'idle' | 'under' | 'inRange' | 'ideal' | 'over'
type ReferenceKey = 'min' | 'ideal' | 'max'

/** Cuánto de la barra (en %) ocupa cada mitad del rango, del ideal al mínimo y del
 *  ideal al máximo. Lo que sobra a los costados es el margen para ver cuánto se
 *  pasó un peso fuera de rango, en vez de que se clave en el borde. */
const RANGE_HALF_WIDTH = 34

/** Qué tan cerca del ideal (fracción del rango) cuenta como "en el ideal". */
const IDEAL_TOLERANCE = 0.1

/** `cssVar` es el mismo color que las clases, para el punto y su halo. */
const STATUS_STYLES: Record<WeightStatus, { label: string; text: string; dot: string; cssVar: string; ping: boolean }> = {
    idle: { label: 'Sin producto', text: 'text-text-muted', dot: 'bg-text-muted', cssVar: 'var(--text-muted)', ping: false },
    under: { label: 'Bajo el mínimo', text: 'text-warning', dot: 'bg-warning', cssVar: 'var(--warning)', ping: true },
    inRange: { label: 'En rango', text: 'text-brand', dot: 'bg-brand', cssVar: 'var(--brand)', ping: false },
    ideal: { label: 'En el ideal', text: 'text-success', dot: 'bg-success', cssVar: 'var(--success)', ping: false },
    over: { label: 'Sobre el máximo', text: 'text-warning', dot: 'bg-warning', cssVar: 'var(--warning)', ping: true },
}

const formatWeight = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
const formatDelta = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })

export function ParametrosReferenciaCard({ parametros, pesoActual }: ParametrosReferenciaProps) {
    const min = Number(parametros.minimo) || 0
    const max = Number(parametros.maximo) || 0
    const ideal = Number(parametros.ideal) || 0
    const currentWeight = Number(pesoActual) || 0
    const unidad = parametros.unidad.toLowerCase()

    const [highlighted, setHighlighted] = useState<ReferenceKey | null>(null)

    const range = max - min
    const hasRange = range > 0
    const status = getStatus(currentWeight, min, ideal, max)

    // La tarjeta que corresponde al estado se resalta sola; el hover la pisa.
    const activeKey: ReferenceKey | null = highlighted ?? (
        status === 'under' ? 'min' : status === 'over' ? 'max' : status === 'inRange' || status === 'ideal' ? 'ideal' : null
    )

    return (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Parámetros de Referencia</h2>
                        <p className="text-[11px] text-slate-400 font-medium">Rango tolerable del lote</p>
                    </div>
                </div>
                <StatusChip status={status} />
            </div>

            {hasRange ? (
                <RangeGauge
                    weight={currentWeight}
                    min={min}
                    ideal={ideal}
                    max={max}
                    unidad={unidad}
                    status={status}
                />
            ) : (
                <p className="text-xs text-text-muted text-center py-4 rounded-2xl border border-dashed border-border-ui">
                    El lote no tiene un rango configurado.
                </p>
            )}

            <ReferenceValuesGrid
                min={min}
                ideal={ideal}
                max={max}
                unidad={unidad}
                status={status}
                activeKey={activeKey}
                onHighlight={setHighlighted}
            />
        </div>
    )
}

function getStatus(weight: number, min: number, ideal: number, max: number): WeightStatus {
    if (weight <= 0) return 'idle'
    if (weight < min) return 'under'
    if (weight > max) return 'over'
    if (Math.abs(weight - ideal) <= (max - min) * IDEAL_TOLERANCE) return 'ideal'
    return 'inRange'
}

function StatusChip({ status }: { status: WeightStatus }) {
    const style = STATUS_STYLES[status]
    return (
        <span className={`inline-flex items-center gap-2 shrink-0 rounded-full border border-current/20 bg-current/5 px-3 py-1 text-[11px] font-bold transition-colors duration-300 ${style.text}`}>
            <span className="relative flex w-2 h-2">
                {style.ping && <span className={`absolute inset-0 rounded-full opacity-60 animate-ping ${style.dot}`} />}
                <span className={`relative w-2 h-2 rounded-full ${style.dot}`} />
            </span>
            {style.label}
        </span>
    )
}

interface RangeGaugeProps {
    weight: number
    min: number
    ideal: number
    max: number
    unidad: string
    status: WeightStatus
}

/** Barra lineal: el tramo verde es [mín, máx], la marca es el ideal y el punto es
 *  el peso en vivo. El ideal va **siempre al centro** y el mínimo y el máximo a la
 *  misma distancia de él, aunque el ideal no esté a mitad de rango: una marca
 *  corrida hacia un lado se lee como "el ideal está mal". Por eso la escala es por
 *  tramos — cada mitad tiene la suya (ideal−mín a la izquierda, máx−ideal a la
 *  derecha) — y el punto cruza la marca justo cuando el peso cruza el ideal. */
export function RangeGauge({ weight, min, ideal, max, unidad, status }: RangeGaugeProps) {
    // Si el ideal coincide con un extremo (dato mal cargado), esa mitad usa la del
    // rango completo para no dividir por cero.
    const fallbackSide = (max - min) / 2
    const leftSide = ideal - min > 0 ? ideal - min : fallbackSide
    const rightSide = max - ideal > 0 ? max - ideal : fallbackSide

    const toPercent = (value: number) => {
        const offset = value < ideal ? (value - ideal) / leftSide : (value - ideal) / rightSide
        return Math.max(0, Math.min(100, 50 + offset * RANGE_HALF_WIDTH))
    }

    const minPos = 50 - RANGE_HALF_WIDTH
    const maxPos = 50 + RANGE_HALF_WIDTH
    const idealPos = 50
    // Los pesos que caen en los extremos de la barra, para el `aria-valuemin/max`.
    const domainMin = ideal - leftSide * (50 / RANGE_HALF_WIDTH)
    const domainMax = ideal + rightSide * (50 / RANGE_HALF_WIDTH)
    const isIdle = status === 'idle'
    const weightPos = toPercent(weight)
    const color = STATUS_STYLES[status].cssVar

    const hint = {
        idle: 'Coloque el producto sobre la báscula',
        under: `Faltan ${formatWeight(min - weight)} ${unidad} para el mínimo`,
        over: `Sobran ${formatWeight(weight - max)} ${unidad} sobre el máximo`,
        inRange: 'Dentro del rango tolerable',
        ideal: 'Peso ideal alcanzado',
    }[status]

    return (
        <div
            role="meter"
            aria-label="Peso actual respecto al rango"
            aria-valuemin={domainMin}
            aria-valuemax={domainMax}
            aria-valuenow={weight}
            aria-valuetext={`${formatWeight(weight)} ${unidad}, ${STATUS_STYLES[status].label}`}
            className="space-y-3"
        >
            <div className="flex items-baseline justify-between gap-3">
                <p className={`text-lg font-extrabold tabular-nums transition-colors duration-300 ${STATUS_STYLES[status].text}`}>
                    {isIdle ? '—' : formatDelta(weight - ideal)}
                    <span className="text-[11px] font-semibold text-text-muted ml-1">{unidad} vs ideal</span>
                </p>
                <p className="text-[11px] font-medium text-text-muted text-right">{hint}</p>
            </div>

            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-zinc-800">
                <div
                    className="absolute inset-y-0 rounded-full bg-indigo-200 dark:bg-indigo-900"
                    style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
                />

                <div
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-indigo-500"
                    style={{ left: `${idealPos}%` }}
                />

                <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 shadow"
                    style={{
                        left: `${weightPos}%`,
                        background: color,
                        opacity: isIdle ? 0 : 1,
                        transition: 'left 250ms ease-out, background 300ms, opacity 300ms',
                    }}
                />
            </div>
        </div>
    )
}

interface ReferenceValuesGridProps {
    min: number
    ideal: number
    max: number
    /** `unidad_medida` del lote, ya en minúsculas. */
    unidad: string
    status: WeightStatus
    activeKey: ReferenceKey | null
    onHighlight: (key: ReferenceKey | null) => void
}

export function ReferenceValuesGrid({ min, ideal, max, unidad, status, activeKey, onHighlight }: ReferenceValuesGridProps) {
    const tiles: { key: ReferenceKey; label: string; value: number }[] = [
        { key: 'min', label: 'Mínimo', value: min },
        { key: 'ideal', label: 'Ideal', value: ideal },
        { key: 'max', label: 'Máximo', value: max },
    ]
    const isWarning = status === 'under' || status === 'over'

    return (
        <div className="grid grid-cols-3 gap-3">
            {tiles.map((tile) => {
                const isActive = activeKey === tile.key
                const activeStyle = isWarning && tile.key !== 'ideal'
                    ? 'border-warning/40 bg-warning/5 ring-4 ring-warning/10'
                    : 'border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/30 ring-4 ring-indigo-500/10'

                return (
                    <div
                        key={tile.key}
                        onPointerEnter={() => onHighlight(tile.key)}
                        onPointerLeave={() => onHighlight(null)}
                        className={`rounded-2xl border p-3 text-center cursor-default transition-all duration-200 hover:-translate-y-0.5 ${
                            isActive
                                ? activeStyle
                                : 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40'
                        }`}
                    >
                        <p className={`text-[10px] font-bold uppercase tracking-tight ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                            {tile.label}
                        </p>
                        <p className={`text-sm font-extrabold tabular-nums mt-0.5 ${
                            tile.key === 'ideal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-zinc-200'
                        }`}>
                            {formatWeight(tile.value)}
                            <span className="text-slate-400 font-normal text-xs ml-0.5">{unidad}</span>
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
