import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import {
    buildTourStops,
    nextTourStop,
    pickTourAlert,
    TOUR_ALERT_DWELL_MS,
    TOUR_CLIENT_DWELL_MS,
    TOUR_PLANT_DWELL_MS,
    TOUR_RESUME_AFTER_MS,
    type TourAlert,
    type TourStop,
} from '#/presentation/hooks/mirador/plantTour'
import type { PlantTwin } from '#/presentation/hooks/mirador/usePlantTwin'

export type TourStatus = 'off' | 'running' | 'paused-auto' | 'paused-manual'

interface TourState {
    status: TourStatus
    stop: TourStop | null
    /** Mientras no es `null`, la cámara está en el pesaje fuera de rango. */
    alert: TourAlert | null
    /** Cambia con cada parada o alerta: reinicia la barra de tiempo. */
    stopKey: number
}

/**
 * Lo que marca este atributo (los botones del indicador) no cuenta como
 * interacción: apretar **Pausar** no puede pausar antes por su `pointerdown`.
 */
export const TOUR_CONTROLS_ATTR = 'data-plant-tour-controls'

const OFF: TourState = { status: 'off', stop: null, alert: null, stopKey: 0 }
const PLANT_STOP: TourStop = { kind: 'planta' }

interface UsePlantTourOptions {
    twin: Pick<PlantTwin, 'snapshot' | 'slots' | 'events' | 'seq' | 'selection' | 'select'>
    /** Pantalla completa pedida por **Modo TV** y activa. En `false`, el recorrido termina. */
    enabled: boolean
    /** El contenedor del Mirador: un click o la rueda adentro pausan el recorrido. */
    containerRef: RefObject<HTMLElement | null>
}

/**
 * El recorrido del modo TV (SPEC 23). Sólo cambia la selección: la cámara la
 * mueve la escena con `focusCamera`, y no agrega pedidos al backend. Las paradas
 * son de cliente; sólo una alerta (un pesaje nuevo fuera de rango) entra a un
 * pesaje, y eso es como mucho un `GET /pesajes/byLote/:loteId`.
 *
 * Un solo `setTimeout` por parada. Tocar el tablero lo pausa y se retoma solo a
 * los `TOUR_RESUME_AFTER_MS`; **Pausar** lo deja quieto hasta **Reanudar**.
 */
export function usePlantTour({ twin, enabled, containerRef }: UsePlantTourOptions) {
    const { snapshot, slots, events, seq, selection, select } = twin

    const [state, setState] = useState<TourState>(OFF)

    // Lo último de cada render, para los timers y los listeners.
    const stateRef = useRef(state)
    stateRef.current = state
    const datos = useRef({ snapshot, slots, selection, select })
    datos.current = { snapshot, slots, selection, select }

    /** Fila del cliente de la parada actual: la de uno que salió de la foto ya no está en `slots`. */
    const filaRef = useRef<number | undefined>(undefined)
    const retomarRef = useRef<number | undefined>(undefined)
    const fotoProcesada = useRef(seq)

    const limpiarRetomar = useCallback(() => {
        window.clearTimeout(retomarRef.current)
        retomarRef.current = undefined
    }, [])

    const irA = useCallback((stop: TourStop, alert: TourAlert | null = null) => {
        const { slots: s, select: sel } = datos.current
        const clientId = alert?.clientId ?? (stop.kind === 'cliente' ? stop.clientId : null)
        filaRef.current = clientId !== null ? s.rows[clientId] : undefined
        if (alert) sel({ clientId: alert.clientId, lotId: alert.lotId, weighingId: alert.weighingId })
        else sel(stop.kind === 'cliente' ? { clientId: stop.clientId } : {})
        setState((prev) => ({ status: 'running', stop, alert, stopKey: prev.stopKey + 1 }))
    }, [])

    const avanzarDesde = useCallback((current: TourStop | null) => {
        const { snapshot: foto, slots: s } = datos.current
        irA(nextTourStop(buildTourStops(foto, s), current, s.rows, filaRef.current))
    }, [irA])

    /** Retomar sigue después de lo que esté seleccionado: si el usuario fue al cliente X, sigue tras X. */
    const retomar = useCallback(() => {
        limpiarRetomar()
        const { selection: sel, slots: s } = datos.current
        if (sel.clientId === null) return avanzarDesde(PLANT_STOP)
        filaRef.current = s.rows[sel.clientId]
        avanzarDesde({ kind: 'cliente', clientId: sel.clientId })
    }, [avanzarDesde, limpiarRetomar])

    const start = useCallback(() => {
        limpiarRetomar()
        // Lo que ya traía la foto actual no es una alerta: el recorrido arranca en la planta.
        fotoProcesada.current = seq
        irA(PLANT_STOP)
    }, [irA, limpiarRetomar, seq])

    const exit = useCallback(() => {
        limpiarRetomar()
        setState((prev) => (prev.status === 'off' ? prev : { ...OFF, stopKey: prev.stopKey }))
    }, [limpiarRetomar])

    const togglePause = useCallback(() => {
        const status = stateRef.current.status
        if (status === 'running') {
            limpiarRetomar()
            setState((prev) => ({ ...prev, status: 'paused-manual' }))
        } else if (status === 'paused-auto' || status === 'paused-manual') {
            retomar()
        }
    }, [limpiarRetomar, retomar])

    // `enabled` arranca y termina el recorrido. Al terminar, la selección queda donde estaba.
    const startRef = useRef(start)
    startRef.current = start
    useEffect(() => {
        if (enabled) startRef.current()
        else exit()
    }, [enabled, exit])

    // El timer de la parada. `stopKey` cambia con cada parada o alerta, y la pausa lo corta.
    useEffect(() => {
        if (state.status !== 'running' || state.stop === null) return
        const { stop, alert } = state
        const dwell = alert ? TOUR_ALERT_DWELL_MS : stop.kind === 'planta' ? TOUR_PLANT_DWELL_MS : TOUR_CLIENT_DWELL_MS
        const id = window.setTimeout(() => {
            // Después de una alerta, sigue el cliente siguiente al de la alerta.
            avanzarDesde(alert ? { kind: 'cliente', clientId: alert.clientId } : stop)
        }, dwell)
        return () => window.clearTimeout(id)
        // `stop` y `alert` no van en las dependencias: cambian sólo junto con `stopKey`.
    }, [state.status, state.stopKey, avanzarDesde])

    // Alertas: una vez por foto, y sólo corriendo. En pausa, quien toca el tablero está leyendo.
    useEffect(() => {
        if (fotoProcesada.current === seq) return
        fotoProcesada.current = seq
        if (stateRef.current.status !== 'running') return
        const alert = pickTourAlert(events)
        if (alert) irA({ kind: 'cliente', clientId: alert.clientId }, alert)
    }, [seq, events, irA])

    // Pausa automática: click, rueda o tecla. Mover el mouse no cuenta.
    useEffect(() => {
        const el = containerRef.current
        if (!enabled || !el) return

        const alInteractuar = (e: Event) => {
            if (e.target instanceof Element && e.target.closest(`[${TOUR_CONTROLS_ATTR}]`)) return
            const status = stateRef.current.status
            if (status !== 'running' && status !== 'paused-auto') return
            if (status === 'running') setState((prev) => ({ ...prev, status: 'paused-auto' }))
            limpiarRetomar()
            retomarRef.current = window.setTimeout(retomar, TOUR_RESUME_AFTER_MS)
        }

        el.addEventListener('pointerdown', alInteractuar, true)
        el.addEventListener('wheel', alInteractuar, { capture: true, passive: true })
        // La tecla va en `document`: en pantalla completa el foco suele quedar en el
        // `body`, fuera del contenedor, y el `keydown` nunca llegaría a él.
        document.addEventListener('keydown', alInteractuar, true)
        return () => {
            el.removeEventListener('pointerdown', alInteractuar, true)
            el.removeEventListener('wheel', alInteractuar, true)
            document.removeEventListener('keydown', alInteractuar, true)
        }
    }, [enabled, containerRef, limpiarRetomar, retomar])

    useEffect(() => limpiarRetomar, [limpiarRetomar])

    const stops = useMemo(() => (state.status === 'off' ? [] : buildTourStops(snapshot, slots)), [state.status, snapshot, slots])
    const clientStops = Math.max(0, stops.length - 1)

    let position: { index: number; total: number } | null = null
    if (state.stop?.kind === 'cliente' && !state.alert) {
        const clientId = state.stop.clientId
        const index = stops.findIndex((s) => s.kind === 'cliente' && s.clientId === clientId)
        if (index > 0) position = { index, total: clientStops }
    }

    const dwellMs = state.alert ? TOUR_ALERT_DWELL_MS : state.stop?.kind === 'cliente' ? TOUR_CLIENT_DWELL_MS : TOUR_PLANT_DWELL_MS

    return {
        active: state.status !== 'off',
        status: state.status,
        stop: state.stop,
        alert: state.alert,
        position,
        /** Clientes con lotes activos en la foto actual: `0` es "Sin lotes activos". */
        clientStops,
        dwellMs,
        stopKey: state.stopKey,
        start,
        exit,
        togglePause,
    }
}

export type PlantTour = ReturnType<typeof usePlantTour>
