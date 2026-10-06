import { clientColor } from '#/presentation/components/mirador/clientColors'
import { nf0 } from '#/presentation/components/mirador/format'
import { ACTIVE_STAGES, STAGE_LABEL, type PlantClient, type PlantSelection, type PlantSnapshot, type SlotMap } from '#/presentation/types/mirador/plantTwin.types'

import { ClientSwatch, Eyebrow, PanelTitle, ROW_BUTTON, SectionHeading } from './panelParts'

interface PlantSummaryPanelProps {
    snapshot: PlantSnapshot
    slots: SlotMap
    onSelect: (selection: Partial<PlantSelection>) => void
}

const bultosActivos = (c: PlantClient) =>
    c.lotes.reduce((s, l) => s + (l.etapa === 'en-pesaje' || l.etapa === 'por-aprobar' ? l.bultos : 0), 0)

const LEYENDA = [
    { figura: <span className="size-4 rounded-full bg-success shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]" />, texto: 'Ficha verde: pesaje en rango' },
    { figura: <span className="size-4 rounded-full bg-warning shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]" />, texto: 'Ficha ámbar: en rango, pero a más del 60 % del camino hacia un límite' },
    { figura: <span className="size-4 rounded-full bg-destructive shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]" />, texto: 'Ficha roja: fuera de rango, apilada aparte en su lote' },
    { figura: <span className="size-5 rounded-full border-[3px] border-warning" />, texto: 'Anillo ámbar y supervisor: el lote espera aprobación' },
    { figura: <span className="h-3.5 w-6 rounded-[3px] bg-[repeating-linear-gradient(90deg,var(--text-muted)_0_2px,transparent_2px_5px)] opacity-80" />, texto: 'Contenedor con su camión: lote finalizado. Cuando sale de planta, el camión se lo lleva' },
    { figura: <Persona color="#F2B705" />, texto: 'Estibador: acompaña a cada lote en pesaje y recibe cada bulto' },
    { figura: <Persona color="#E2E8F0" />, texto: 'Gente en los pasillos, carritos de picking y operario de báscula: ambientación, no son datos' },
]

function Persona({ color }: { color: string }) {
    return (
        <span className="relative mt-2 h-[18px] w-3 rounded-t-[6px] rounded-b-[3px] border border-border-ui" style={{ background: color }}>
            <span className="absolute -top-2 left-1/2 size-[9px] -translate-x-1/2 rounded-full bg-[#D9A97E]" />
        </span>
    )
}

/** Nivel Planta: los clientes con lotes en planta y cómo leer el tablero. */
export function PlantSummaryPanel({ snapshot, slots, onSelect }: PlantSummaryPanelProps) {
    const clientes = [...snapshot.clientes].sort((a, b) => bultosActivos(b) - bultosActivos(a) || a.nombre.localeCompare(b.nombre))

    return (
        <>
            <Eyebrow>Planta</Eyebrow>
            <PanelTitle>Clientes en planta</PanelTitle>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted">
                Cada territorio es un cliente. Sus lotes avanzan por las cuatro casillas y cada ficha apilada es un pesaje.
            </p>

            <SectionHeading>Por actividad</SectionHeading>
            <ul className="space-y-0.5">
                {clientes.map((c) => {
                    const color = clientColor(slots.rows[c.id])
                    return (
                        <li key={c.id}>
                            <button type="button" onClick={() => onSelect({ clientId: c.id })} className={`${ROW_BUTTON} grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5`}>
                                <ClientSwatch name={c.nombre} color={color} className="row-span-2 size-8 rounded-[10px] text-xs" />
                                <b className="truncate text-[13.5px] font-semibold text-text-main">{c.nombre}</b>
                                <em className="text-xs not-italic text-text-muted tabular-nums">{nf0.format(bultosActivos(c))} bultos</em>
                                <span className="col-span-2 grid grid-cols-4 gap-[3px]">
                                    {ACTIVE_STAGES.map((etapa) => {
                                        const n = c.lotes.filter((l) => l.etapa === etapa).length
                                        return (
                                            <i
                                                key={etapa}
                                                title={STAGE_LABEL[etapa]}
                                                className={`grid h-4 place-items-center rounded-[5px] text-[10px] font-bold not-italic tabular-nums ${n ? 'text-text-main' : 'bg-muted text-text-muted'}`}
                                                style={n ? { background: `color-mix(in srgb, ${color} 22%, transparent)` } : undefined}
                                            >
                                                {n}
                                            </i>
                                        )
                                    })}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>

            <SectionHeading>Cómo leer el tablero</SectionHeading>
            <ul className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 text-[12.5px] leading-snug text-text-main">
                {LEYENDA.map((item) => (
                    <li key={item.texto} className="contents">
                        <span className="grid w-7 place-items-center">{item.figura}</span>
                        <span>{item.texto}</span>
                    </li>
                ))}
            </ul>
        </>
    )
}
