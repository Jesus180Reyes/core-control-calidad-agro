import type { PlantEvent, PlantSnapshot, SlotMap } from '#/presentation/types/mirador/plantTwin.types'

/**
 * Lógica pura del modo TV del Mirador (SPEC 23). El recorrido sólo cambia la
 * selección: la cámara la mueve la escena con `focusCamera`.
 */

export const TOUR_PLANT_DWELL_MS = 10_000
export const TOUR_CLIENT_DWELL_MS = 15_000
export const TOUR_ALERT_DWELL_MS = 12_000
export const TOUR_RESUME_AFTER_MS = 90_000

export type TourStop = { kind: 'planta' } | { kind: 'cliente'; clientId: number }

export interface TourAlert {
    clientId: number
    lotId: number
    weighingId: number
}

const PLANT_STOP: TourStop = { kind: 'planta' }

/**
 * La planta primero, y después cada cliente con algún lote en pesaje o por
 * aprobar, en el orden de sus filas en la escena. Un cliente sin fila no entra.
 */
export function buildTourStops(snapshot: PlantSnapshot, slots: SlotMap): TourStop[] {
    const clientes = snapshot.clientes
        .filter((c) => slots.rows[c.id] !== undefined && c.lotes.some((l) => l.etapa === 'en-pesaje' || l.etapa === 'por-aprobar'))
        .sort((a, b) => slots.rows[a.id] - slots.rows[b.id])

    return [PLANT_STOP, ...clientes.map((c): TourStop => ({ kind: 'cliente', clientId: c.id }))]
}

/**
 * La parada que sigue a `current` en la lista recalculada. La actual se busca por
 * `clientId`, no por índice: entre dos paradas la foto pudo cambiar.
 *
 * Si el cliente actual ya no está en la lista, se sigue con el primero cuya fila
 * sea mayor que `currentRow`, la fila que tenía; sin ella se usa la de `rows`, y
 * sin ninguna de las dos se vuelve a la planta. La fila la recuerda quien llama,
 * porque la de un cliente que salió de la foto ya no está en `rows`.
 */
export function nextTourStop(
    stops: TourStop[],
    current: TourStop | null,
    rows: SlotMap['rows'],
    currentRow?: number,
): TourStop {
    if (current === null) return PLANT_STOP

    const clientes = stops.filter((s): s is Extract<TourStop, { kind: 'cliente' }> => s.kind === 'cliente')

    if (current.kind === 'planta') return clientes[0] ?? PLANT_STOP

    const indice = clientes.findIndex((s) => s.clientId === current.clientId)
    if (indice !== -1) return clientes[indice + 1] ?? PLANT_STOP

    const fila = currentRow ?? rows[current.clientId]
    if (fila === undefined) return PLANT_STOP
    return clientes.find((s) => rows[s.clientId] > fila) ?? PLANT_STOP
}

/**
 * La alerta de una foto: el pesaje nuevo fuera de rango de mayor id. Una foto con
 * seis pesajes malos produce una sola alerta.
 */
export function pickTourAlert(events: PlantEvent[]): TourAlert | null {
    let alerta: TourAlert | null = null
    for (const evento of events) {
        if (evento.type !== 'weighing-added' || !evento.weighing.fuera_de_rango) continue
        if (alerta && alerta.weighingId >= evento.weighing.id) continue
        alerta = { clientId: evento.clientId, lotId: evento.lotId, weighingId: evento.weighing.id }
    }
    return alerta
}
