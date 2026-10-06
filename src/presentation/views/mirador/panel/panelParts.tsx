import type { ReactNode } from 'react'

import { clientInitials } from '#/presentation/components/mirador/clientColors'
import type { PlantLot } from '#/presentation/types/mirador/plantTwin.types'

/** Piezas que repiten los cuatro paneles del Mirador. */

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
    return (
        <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
            {color && <span aria-hidden className="size-2.5 rounded-[4px]" style={{ background: color }} />}
            {children}
        </div>
    )
}

export function PanelTitle({ children }: { children: ReactNode }) {
    return <h2 className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-balance text-text-main">{children}</h2>
}

export function SectionHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
    return (
        <h3 className="mt-6 mb-2 flex items-baseline justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
            <span>{children}</span>
            {aside !== undefined && <span>{aside}</span>}
        </h3>
    )
}

export function StatGrid({ items }: { items: { label: string; value: string }[] }) {
    return (
        <dl className="mt-4 grid grid-cols-3 gap-2">
            {items.map((s) => (
                <div key={s.label} className="min-w-0 rounded-xl bg-muted/60 px-2.5 pt-2 pb-2.5">
                    <dt className="truncate text-[10.5px] text-text-muted">{s.label}</dt>
                    <dd className="mt-0.5 truncate text-base font-bold tracking-tight text-text-main tabular-nums">{s.value}</dd>
                </div>
            ))}
        </dl>
    )
}

export function ClientSwatch({ name, color, className = 'size-8 rounded-[10px] text-xs' }: { name: string; color: string; className?: string }) {
    return (
        <span
            aria-hidden
            className={`grid shrink-0 place-items-center font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] ${className}`}
            style={{ background: color }}
        >
            {clientInitials(name)}
        </span>
    )
}

/** Proporción en rango / fuera, como barra apilada. */
export function QualityBar({ lot }: { lot: PlantLot }) {
    const total = lot.bultos || 1
    const fuera = (lot.bultos_fuera_rango / total) * 100
    return (
        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <i className="block h-full bg-success" style={{ width: `${lot.bultos ? 100 - fuera : 0}%` }} />
            <i className="block h-full bg-destructive" style={{ width: `${fuera}%` }} />
        </span>
    )
}

export function pctInRange(lot: PlantLot): number | null {
    return lot.bultos ? ((lot.bultos - lot.bultos_fuera_rango) / lot.bultos) * 100 : null
}

export const ROW_BUTTON = 'w-full rounded-xl p-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-brand'
