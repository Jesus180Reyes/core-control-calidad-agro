import { useEffect, useRef, useState } from 'react'
import { Hand, RotateCcw, Scale } from 'lucide-react'

interface BannerEstabilizacionProps {
    /** Segundos que faltan, en enteros (`Math.ceil` del hook). */
    tiempo: number
    /** Duración total de la ventana de estabilización. */
    total: number
    pesoActual: number
    unidad: string
}

/** Cuánto queda a la vista el aviso de "el peso se movió". */
const AVISO_REINICIO_MS = 1800

export function BannerEstabilizacion({ tiempo, total, pesoActual, unidad }: BannerEstabilizacionProps) {
    const tiempoPrevioRef = useRef(tiempo)
    // Cada reinicio remonta el anillo: vuelve a cero sin animar hacia atrás.
    const [reinicios, setReinicios] = useState(0)
    const [avisoReinicio, setAvisoReinicio] = useState(false)
    // En un ref y no en el cleanup del efecto: el tick siguiente del conteo lo cancelaría.
    const avisoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const previo = tiempoPrevioRef.current
        tiempoPrevioRef.current = tiempo
        // El conteo sólo baja; si sube es porque el peso se movió y la ventana empezó de nuevo.
        if (tiempo <= previo) return

        setReinicios((n) => n + 1)
        setAvisoReinicio(true)
        if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
        avisoTimerRef.current = setTimeout(() => setAvisoReinicio(false), AVISO_REINICIO_MS)
    }, [tiempo])

    useEffect(() => () => {
        if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    }, [])

    const segundos = Math.max(0, Math.min(tiempo, total))
    const transcurrido = total > 0 ? (total - segundos) / total : 1
    // El hook avisa de a segundos enteros: mientras muestra N, el anillo avanza
    // durante ese segundo hasta donde estará cuando pase a N-1.
    const destino = total > 0 ? Math.min(1, (total - segundos + 1) / total) : 1

    const fase =
        segundos >= total ? 'Leyendo el peso…'
            : segundos <= 1 ? 'Casi listo…'
                : 'Estabilizando…'

    return (
        <div
            role="status"
            aria-live="polite"
            className="relative overflow-hidden rounded-2xl border border-brand/25 bg-surface shadow-clay-card p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-300"
        >
            <div className="flex items-center gap-4 sm:gap-5">
                <ProgressRing key={reinicios} desde={transcurrido} hasta={destino} segundos={segundos} />

                <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex items-center gap-2 text-sm font-bold text-brand">
                        <Scale className="size-4 shrink-0" aria-hidden />
                        {fase}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-text-main">
                        <Hand className="size-4 shrink-0 text-text-muted" aria-hidden />
                        No retire ni mueva el producto de la plataforma.
                    </p>
                    <p className="text-xs text-text-muted">
                        Lectura actual:{' '}
                        <span className="font-semibold tabular-nums text-text-main">
                            {pesoActual.toFixed(2)} {unidad}
                        </span>
                    </p>
                </div>
            </div>

            {avisoReinicio && (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning animate-in fade-in duration-200">
                    <RotateCcw className="size-3.5 shrink-0" aria-hidden />
                    El peso se movió: el conteo volvió a empezar.
                </p>
            )}
        </div>
    )
}

interface ProgressRingProps {
    /** Avance con el que se monta, sin animar (0–1). */
    desde: number
    /** Avance al que llega en el segundo en curso (0–1). */
    hasta: number
    segundos: number
}

function ProgressRing({ desde, hasta, segundos }: ProgressRingProps) {
    const [avance, setAvance] = useState(desde)

    useEffect(() => {
        // Doble frame: el primero pinta el punto de partida, el segundo dispara
        // la transición. Con uno solo el navegador salta directo al destino.
        let segundo = 0
        const primero = requestAnimationFrame(() => {
            segundo = requestAnimationFrame(() => setAvance(hasta))
        })
        return () => {
            cancelAnimationFrame(primero)
            cancelAnimationFrame(segundo)
        }
    }, [hasta])

    return (
        <div className="relative size-16 shrink-0 sm:size-20">
            <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="6" className="stroke-brand/15" />
                <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray={100}
                    strokeDashoffset={100 * (1 - avance)}
                    className="stroke-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span key={segundos} className="text-2xl font-extrabold tabular-nums text-text-main animate-in zoom-in-75 fade-in duration-300 sm:text-3xl">
                    {segundos}
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">seg</span>
            </div>
        </div>
    )
}
