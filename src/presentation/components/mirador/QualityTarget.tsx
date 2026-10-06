import { DIANA_ALCANCE, targetPoint, type LotRange } from '#/presentation/hooks/mirador/qualityTarget'
import type { PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

const COLOR = { ok: 'var(--success)', desviado: 'var(--warning)', fuera: 'var(--destructive)' } as const

interface QualityTargetProps {
    range: LotRange
    lotName: string
    weighings: PlantWeighing[]
    /** Pesaje resaltado (nivel Pesaje). */
    highlightId?: number | null
    className?: string
}

/**
 * La diana de calidad: cada punto es un pesaje, el centro es el peso ideal y el
 * anillo rojo es el límite. A la derecha los que pesan de más, a la izquierda los
 * de menos. Un lote centrado, cargado hacia un lado o disperso se ve de un vistazo.
 */
export function QualityTarget({ range, lotName, weighings, highlightId = null, className = '' }: QualityTargetProps) {
    const R = 100
    const limite = R / DIANA_ALCANCE
    const banda = limite * 0.6
    const ultimo = weighings[0]
    const puntos = weighings.map((w) => ({ id: w.id, ...targetPoint(range, Number(w.peso_neto), w.id, R, w.fuera_de_rango) }))
    const marcado = puntos.find((p) => p.id === highlightId)
    const reciente = ultimo && ultimo.id !== highlightId ? puntos.find((p) => p.id === ultimo.id) : undefined

    return (
        <svg
            viewBox="-118 -112 236 224"
            role="img"
            aria-label={`Diana de calidad del lote ${lotName}: ${weighings.length} pesajes; el centro es el peso ideal`}
            className={`mx-auto block h-auto w-full max-w-[300px] ${className}`}
        >
            <circle r={R} fill="color-mix(in srgb, var(--text-muted) 8%, transparent)" stroke="var(--border-ui)" />
            <circle r={banda} fill="color-mix(in srgb, var(--success) 12%, transparent)" />
            <circle r={banda} fill="none" stroke="var(--border-ui)" strokeDasharray="3 4" />
            <circle r={limite} fill="none" stroke="var(--destructive)" strokeOpacity={0.7} strokeWidth={1.5} />
            <line x1={0} y1={-R} x2={0} y2={R} stroke="var(--border-ui)" />
            <text x={R - 4} y={-(R - 12)} textAnchor="end" fontSize={9} fill="var(--text-muted)">más pesado</text>
            <text x={-(R - 4)} y={-(R - 12)} textAnchor="start" fontSize={9} fill="var(--text-muted)">más liviano</text>
            <text x={0} y={limite + 11} textAnchor="middle" fontSize={8.5} fill="var(--destructive)">límite mín / máx</text>
            {puntos.filter((p) => p.id !== highlightId).map((p) => (
                <circle key={p.id} cx={p.x} cy={-p.y} r={3.4} fill={COLOR[p.level]} fillOpacity={0.85} />
            ))}
            {reciente && <circle cx={reciente.x} cy={-reciente.y} r={7} fill="none" stroke="var(--brand)" strokeWidth={1.5} />}
            {marcado && <circle cx={marcado.x} cy={-marcado.y} r={6} fill={COLOR[marcado.level]} stroke="var(--text-main)" strokeWidth={2} />}
            <circle r={3} fill="var(--brand)" />
        </svg>
    )
}
