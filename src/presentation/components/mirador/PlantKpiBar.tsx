import type { PlantKpis } from '#/presentation/types/mirador/plantTwin.types'

import { formatMass, GLASS, nf0, nf1 } from './format'

interface PlantKpiBarProps {
    kpis: PlantKpis
    clientCount: number
}

/** Los cuatro números de la planta, del día. */
export function PlantKpiBar({ kpis, clientCount }: PlantKpiBarProps) {
    const masa = formatMass(kpis.peso_neto_hoy)
    const tarjetas = [
        { label: 'Pesajes hoy', value: nf0.format(kpis.pesajes_hoy), unit: '' },
        { label: 'Peso neto hoy', value: masa.value, unit: masa.unit },
        { label: 'En rango', value: kpis.pct_en_rango_hoy === null ? '—' : nf1.format(kpis.pct_en_rango_hoy), unit: kpis.pct_en_rango_hoy === null ? '' : '%', tone: 'text-success' },
        { label: 'Lotes activos', value: nf0.format(kpis.lotes_activos), unit: `de ${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'}` },
    ]

    return (
        <div id="mirador-kpis" className="pointer-events-auto flex min-w-0 gap-2.5 overflow-x-auto [scrollbar-width:none] animate-in fade-in slide-in-from-left-2 duration-300 motion-reduce:animate-none">
            {tarjetas.map((t) => (
                <div key={t.label} className={`${GLASS} min-w-[118px] shrink-0 px-3.5 pt-2.5 pb-3`}>
                    <p className="text-[11px] font-medium text-text-muted">{t.label}</p>
                    <p className={`mt-0.5 text-[22px] font-bold leading-tight tracking-tight tabular-nums ${t.tone ?? 'text-text-main'}`}>
                        {t.value}
                        {t.unit && <small className="ml-1 text-xs font-semibold text-text-muted">{t.unit}</small>}
                    </p>
                </div>
            ))}
        </div>
    )
}
