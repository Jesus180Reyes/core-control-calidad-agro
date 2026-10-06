import { formatTime, nf2, QUALITY_BG, QUALITY_LABEL } from '#/presentation/components/mirador/format'
import { QualityTarget } from '#/presentation/components/mirador/QualityTarget'
import { qualityLevel } from '#/presentation/hooks/mirador/qualityTarget'
import type { PlantClient, PlantLot, PlantSelection, PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

import { Eyebrow, PanelTitle, SectionHeading } from './panelParts'

interface WeighingPanelProps {
    client: PlantClient
    lot: PlantLot
    color: string
    weighing: PlantWeighing
    weighings: PlantWeighing[]
    onSelect: (selection: Partial<PlantSelection>) => void
}

/** Nivel Pesaje: sale de la lista que ya cargó el nivel Lote, sin petición nueva. */
export function WeighingPanel({ client, lot, color, weighing, weighings, onSelect }: WeighingPanelProps) {
    const peso = Number(weighing.peso_neto)
    const nivel = qualityLevel(lot, peso, weighing.fuera_de_rango)
    const desvio = peso - Number(lot.peso_ideal)

    return (
        <>
            <Eyebrow color={color}>
                <button type="button" onClick={() => onSelect({ clientId: client.id, lotId: lot.id })} className="text-brand hover:underline underline-offset-2">
                    Lote {lot.nombre_lote}
                </button>
            </Eyebrow>
            <PanelTitle>Pesaje #{weighing.id}</PanelTitle>

            <p className="mt-3.5 font-mono text-[40px] font-semibold leading-none tracking-tight text-text-main tabular-nums">
                {nf2.format(peso)}
                <small className="ml-1 text-[15px] text-text-muted">{lot.unidad_medida}</small>
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pr-2.5 pl-2 text-xs font-semibold text-text-main">
                <i aria-hidden className={`size-2 rounded-full ${QUALITY_BG[nivel]}`} />
                {QUALITY_LABEL[nivel]} · {desvio >= 0 ? '+' : '−'}{nf2.format(Math.abs(desvio))} {lot.unidad_medida} {desvio >= 0 ? 'sobre' : 'bajo'} el ideal
            </span>

            <dl className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-3">
                {[
                    { label: 'Operario', value: weighing.usuario },
                    { label: 'Hora', value: formatTime(weighing.created_at, true) },
                    { label: 'Cliente', value: client.nombre },
                    { label: 'Rango del lote', value: `${nf2.format(Number(lot.peso_minimo))} – ${nf2.format(Number(lot.peso_maximo))} ${lot.unidad_medida}` },
                ].map((d) => (
                    <div key={d.label} className="min-w-0">
                        <dt className="text-[11px] text-text-muted">{d.label}</dt>
                        <dd className="mt-0.5 text-[13.5px] font-semibold text-text-main [overflow-wrap:anywhere]">{d.value}</dd>
                    </div>
                ))}
            </dl>

            <SectionHeading>Dónde cae en la diana</SectionHeading>
            <QualityTarget range={lot} lotName={lot.nombre_lote} weighings={weighings} highlightId={weighing.id} />
        </>
    )
}
