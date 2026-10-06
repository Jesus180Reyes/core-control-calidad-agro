import { nf0, nf1 } from '#/presentation/components/mirador/format'
import { ACTIVE_STAGES, STAGE_LABEL, type PlantClient, type PlantSelection } from '#/presentation/types/mirador/plantTwin.types'

import { Eyebrow, PanelTitle, QualityBar, ROW_BUTTON, StatGrid, pctInRange } from './panelParts'

interface ClientPanelProps {
    client: PlantClient
    color: string
    onSelect: (selection: Partial<PlantSelection>) => void
}

/** Nivel Cliente: la ficha y sus lotes agrupados por casilla, incluidos los que no entraron en el tablero. */
export function ClientPanel({ client, color, onSelect }: ClientPanelProps) {
    const activos = client.lotes.filter((l) => l.etapa === 'en-pesaje' || l.etapa === 'por-aprobar')
    const bultos = activos.reduce((s, l) => s + l.bultos, 0)
    const fuera = activos.reduce((s, l) => s + l.bultos_fuera_rango, 0)

    return (
        <>
            <Eyebrow color={color}>Cliente</Eyebrow>
            <PanelTitle>{client.nombre}</PanelTitle>
            <p className="mt-1 text-[12.5px] text-text-muted">
                {client.producto ?? 'Sin producto'} · {client.codigo_exportacion ? `Código de exportación ${client.codigo_exportacion}` : 'Sin código de exportación'}
            </p>

            <StatGrid
                items={[
                    { label: 'Lotes activos', value: nf0.format(activos.length) },
                    { label: 'Bultos activos', value: nf0.format(bultos) },
                    { label: 'En rango', value: bultos ? `${nf1.format(((bultos - fuera) / bultos) * 100)} %` : '—' },
                ]}
            />

            {ACTIVE_STAGES.map((etapa, k) => {
                const lotes = client.lotes.filter((l) => l.etapa === etapa)
                return (
                    <section key={etapa}>
                        <h3 className="mt-5 mb-1 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                            <span>{k + 1} · {STAGE_LABEL[etapa]}</span>
                            <span className="tabular-nums">{lotes.length}</span>
                        </h3>
                        {lotes.length === 0 ? (
                            <p className="px-2.5 py-1.5 text-[12.5px] text-text-muted">Sin lotes en esta etapa</p>
                        ) : (
                            <ul className="space-y-0.5">
                                {lotes.map((l) => {
                                    const pct = pctInRange(l)
                                    return (
                                        <li key={l.id}>
                                            <button type="button" onClick={() => onSelect({ clientId: client.id, lotId: l.id })} className={`${ROW_BUTTON} grid grid-cols-[1fr_auto] items-center gap-y-1.5`}>
                                                <b className="font-mono text-[12.5px] font-semibold text-text-main">{l.nombre_lote}</b>
                                                <em className="text-xs not-italic text-text-muted tabular-nums">
                                                    {nf0.format(l.bultos)} bultos{pct === null ? '' : ` · ${nf0.format(pct)} %`}
                                                </em>
                                                <span className="col-span-2 flex"><QualityBar lot={l} /></span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>
                )
            })}
        </>
    )
}
