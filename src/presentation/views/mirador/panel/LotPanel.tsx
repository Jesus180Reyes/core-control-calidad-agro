import { formatTime, nf0, nf1, nf2, QUALITY_BG } from '#/presentation/components/mirador/format'
import { QualityTarget } from '#/presentation/components/mirador/QualityTarget'
import { qualityLevel } from '#/presentation/hooks/mirador/qualityTarget'
import { ACTIVE_STAGES, STAGE_LABEL, type PlantClient, type PlantLot, type PlantSelection, type PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

import { Eyebrow, PanelTitle, ROW_BUTTON, SectionHeading, StatGrid, pctInRange } from './panelParts'

interface LotPanelProps {
    client: PlantClient
    lot: PlantLot
    color: string
    weighings: PlantWeighing[]
    onSelect: (selection: Partial<PlantSelection>) => void
}

/**
 * Nivel Lote. Con el endpoint real, los pesajes salen de `useGetInspeccionPesajes`
 * y su `<Suspense>` + `ErrorBoundary` van acá adentro, no en la ruta: suspender
 * la ruta cambiaría el tablero entero por un spinner.
 */
export function LotPanel({ client, lot, color, weighings, onSelect }: LotPanelProps) {
    const indice = ACTIVE_STAGES.indexOf(lot.etapa as (typeof ACTIVE_STAGES)[number])
    const pct = pctInRange(lot)
    const ideal = Number(lot.peso_ideal)
    const desvioMedio = weighings.length ? weighings.reduce((s, w) => s + (Number(w.peso_neto) - ideal), 0) / weighings.length : 0

    return (
        <>
            <Eyebrow color={color}>
                <button type="button" onClick={() => onSelect({ clientId: client.id })} className="text-brand hover:underline underline-offset-2">
                    {client.nombre}
                </button>
            </Eyebrow>
            <PanelTitle>Lote {lot.nombre_lote}</PanelTitle>
            <p className="mt-1 text-[12.5px] text-text-muted">{lot.producto}</p>

            <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Etapa del lote">
                {ACTIVE_STAGES.map((etapa, k) => (
                    <li
                        key={etapa}
                        aria-current={k === indice ? 'step' : undefined}
                        className={`relative pt-5 text-center text-[10.5px] font-semibold ${k === indice ? 'text-text-main' : 'text-text-muted'}`}
                    >
                        <span
                            aria-hidden
                            className={`absolute inset-x-0 top-1.5 h-1.5 rounded-full ${
                                k < indice ? 'bg-brand/45' : k === indice ? 'bg-brand ring-3 ring-brand/15' : 'bg-muted'
                            }`}
                        />
                        {STAGE_LABEL[etapa]}
                    </li>
                ))}
            </ol>

            <dl className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-border-ui text-center">
                {[
                    { label: 'Mínimo', value: lot.peso_minimo, extra: '' },
                    { label: 'Ideal', value: lot.peso_ideal, extra: 'bg-brand/10' },
                    { label: 'Máximo', value: lot.peso_maximo, extra: '' },
                ].map((r, i) => (
                    <div key={r.label} className={`px-2 py-2 ${r.extra} ${i ? 'border-l border-border-ui' : ''}`}>
                        <dt className="text-[10.5px] text-text-muted">{r.label}</dt>
                        <dd className="font-mono text-[13.5px] font-semibold text-text-main tabular-nums">{nf2.format(Number(r.value))}</dd>
                    </div>
                ))}
            </dl>

            <StatGrid
                items={[
                    { label: 'Bultos', value: nf0.format(lot.bultos) },
                    { label: 'Peso neto', value: `${nf0.format(lot.peso_neto_total)} ${lot.unidad_medida}` },
                    { label: 'En rango', value: pct === null ? '—' : `${nf1.format(pct)} %` },
                ]}
            />

            <SectionHeading>Diana de calidad</SectionHeading>
            {weighings.length ? (
                <>
                    <QualityTarget range={lot} lotName={lot.nombre_lote} weighings={weighings} />
                    <p className="mt-1 text-center text-[12px] leading-relaxed text-text-muted">
                        Desvío medio {desvioMedio >= 0 ? '+' : '−'}{nf2.format(Math.abs(desvioMedio))} {lot.unidad_medida} respecto del ideal.
                        El anillo verde marca el último pesaje.
                    </p>
                </>
            ) : (
                <p className="px-2.5 py-1.5 text-[12.5px] text-text-muted">Todavía no hay pesajes. La diana se llena con cada bulto.</p>
            )}

            <SectionHeading>Últimos pesajes</SectionHeading>
            {weighings.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[12.5px] text-text-muted">Sin pesajes</p>
            ) : (
                <ul className="space-y-0.5">
                    {weighings.slice(0, 8).map((w) => {
                        const nivel = qualityLevel(lot, Number(w.peso_neto), w.fuera_de_rango)
                        return (
                            <li key={w.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect({ clientId: client.id, lotId: lot.id, weighingId: w.id })}
                                    className={`${ROW_BUTTON} grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2`}
                                >
                                    <span aria-hidden className={`size-2.5 rounded-full ${QUALITY_BG[nivel]}`} />
                                    <b className="font-mono text-[12.5px] font-semibold text-text-main tabular-nums">{nf2.format(Number(w.peso_neto))} {lot.unidad_medida}</b>
                                    <em className="text-[11.5px] not-italic text-text-muted tabular-nums">{formatTime(w.created_at)} · {w.usuario}</em>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </>
    )
}
