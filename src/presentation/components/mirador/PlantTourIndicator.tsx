import { Pause, Play, X } from 'lucide-react'

import { TOUR_CONTROLS_ATTR, type PlantTour } from '#/presentation/hooks/mirador/usePlantTour'

import { GLASS } from './format'

interface PlantTourIndicatorProps {
    tour: PlantTour
    /** El cliente de la parada o de la alerta. */
    clientName: string | null
    onTogglePause: () => void
    onExit: () => void
    className?: string
}

const BOTON = 'flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-text-main transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand'

function textoDe(tour: PlantTour, clientName: string | null): string {
    if (tour.status === 'paused-auto' || tour.status === 'paused-manual') return 'En pausa'
    if (tour.alert) return `Fuera de rango · ${clientName ?? `Cliente #${tour.alert.clientId}`}`
    if (tour.stop?.kind === 'cliente') {
        const nombre = clientName ?? `Cliente #${tour.stop.clientId}`
        return tour.position ? `Recorrido · ${tour.position.index} de ${tour.position.total} · ${nombre}` : `Recorrido · ${nombre}`
    }
    return tour.clientStops === 0 ? 'Recorrido · Sin lotes activos' : 'Recorrido · Toda la planta'
}

/**
 * El indicador del modo TV (SPEC 23): dónde está el recorrido, cuánto le queda a
 * la parada, y **Pausar** / **Reanudar** y **Salir del modo TV**. Sus botones no
 * cuentan como interacción con el tablero (`TOUR_CONTROLS_ATTR`).
 */
export function PlantTourIndicator({ tour, clientName, onTogglePause, onExit, className = '' }: PlantTourIndicatorProps) {
    const enPausa = tour.status === 'paused-auto' || tour.status === 'paused-manual'
    const alerta = !enPausa && tour.alert !== null

    return (
        <div
            {...{ [TOUR_CONTROLS_ATTR]: '' }}
            role="status"
            className={`${GLASS} relative flex max-w-full items-center gap-2 self-start overflow-hidden py-1 pr-1 pl-3.5 ${alerta ? 'border-destructive/60' : ''} ${className}`}
        >
            <p className={`min-w-0 truncate text-sm font-bold ${alerta ? 'text-destructive' : 'text-text-main'}`}>{textoDe(tour, clientName)}</p>

            <div className="ml-1 flex shrink-0 items-center gap-0.5">
                <button type="button" className={BOTON} onClick={onTogglePause}>
                    {enPausa ? <Play className="size-3.5" strokeWidth={2.4} aria-hidden /> : <Pause className="size-3.5" strokeWidth={2.4} aria-hidden />}
                    {enPausa ? 'Reanudar' : 'Pausar'}
                </button>
                <button type="button" className={BOTON} onClick={onExit}>
                    <X className="size-3.5" strokeWidth={2.4} aria-hidden />
                    Salir del modo TV
                </button>
            </div>

            {!enPausa && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 motion-reduce:hidden">
                    <span
                        key={tour.stopKey}
                        className={`block h-full ${alerta ? 'bg-destructive' : 'bg-brand'}`}
                        style={{ animation: `tour-progress ${tour.dwellMs}ms linear forwards` }}
                    />
                </span>
            )}
        </div>
    )
}
