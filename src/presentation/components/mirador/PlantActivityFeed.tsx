import { ChevronDown } from 'lucide-react'

import type { ActivityEntry, ActivityTone } from '#/presentation/hooks/mirador/describeEvents'

import { formatTime, GLASS } from './format'

const PUNTO: Record<ActivityTone, string> = {
    ok: 'bg-success',
    desviado: 'bg-warning',
    fuera: 'bg-destructive',
    etapa: 'bg-brand',
    nuevo: 'bg-brand',
    salida: 'bg-text-muted',
    rechazo: 'bg-destructive',
}

interface PlantActivityFeedProps {
    entries: ActivityEntry[]
    collapsed: boolean
    onToggle: () => void
    className?: string
}

/** Lo que pasó desde que se abrió la pantalla. No es un historial: empieza vacío. */
export function PlantActivityFeed({ entries, collapsed, onToggle, className = '' }: PlantActivityFeedProps) {
    const visibles = entries.slice(0, 5)

    return (
        <section aria-label="Actividad reciente" className={`${GLASS} px-3.5 pt-2.5 ${collapsed ? 'pb-2.5' : 'pb-1.5'} ${className}`}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={!collapsed}
                aria-controls="mirador-actividad"
                className="flex w-full items-center justify-between gap-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text-main"
            >
                <span>Actividad</span>
                <span className="flex items-center gap-2">
                    {entries.length > 0 && <span>{entries.length} {entries.length === 1 ? 'evento' : 'eventos'}</span>}
                    <ChevronDown className={`size-3.5 transition-transform duration-300 motion-reduce:transition-none ${collapsed ? '-rotate-90' : ''}`} strokeWidth={2.6} />
                </span>
            </button>

            <div
                id="mirador-actividad"
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
            >
                <ul className="min-h-0 overflow-hidden">
                    {visibles.length === 0 && (
                        <li className="flex items-center gap-2.5 border-t border-border-ui/60 py-2 text-[12.5px] text-text-muted first:mt-1.5">
                            Esperando el primer movimiento de la planta…
                        </li>
                    )}
                    {visibles.map((e, i) => (
                        <li
                            key={e.id}
                            className={`grid grid-cols-[auto_auto_1fr] items-baseline gap-2.5 border-t border-border-ui/60 py-1.5 text-[12.5px] leading-snug first:mt-1.5 ${
                                i === 0 ? 'animate-in fade-in slide-in-from-top-1 duration-500 motion-reduce:animate-none' : ''
                            }`}
                        >
                            <time className="font-mono text-[11px] text-text-muted tabular-nums">{formatTime(e.at, true)}</time>
                            <span aria-hidden className={`size-2 self-center rounded-full ${PUNTO[e.tone]}`} />
                            <span className="min-w-0 text-text-main">
                                {e.lotName && <b className="font-mono font-semibold">{e.lotName} </b>}
                                {e.message}
                                <span className="text-text-muted"> · {e.clientName}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
