import { useCallback, useEffect, useMemo, useState } from 'react'

import { assignSlots } from '#/presentation/hooks/mirador/assignSlots'
import { describeEvents, type ActivityEntry } from '#/presentation/hooks/mirador/describeEvents'
import { diffPlantSnapshot } from '#/presentation/hooks/mirador/diffPlantSnapshot'
import { getPlantMockServer } from '#/presentation/hooks/mirador/plantSnapshotMock'
import type { PlantEvent, PlantLevel, PlantSelection, PlantSnapshot, SlotMap } from '#/presentation/types/mirador/plantTwin.types'

/** Cada cuánto se pide la foto de la planta. */
export const INTERVALO_POLLING_MS = 10_000

/** Después de esto sin una foto nueva, el indicador "en vivo" avisa. */
export const FOTO_VIEJA_MS = 30_000

const ACTIVIDAD_MAX = 40

const SIN_SELECCION: PlantSelection = { clientId: null, lotId: null, weighingId: null }

interface TwinState {
    snapshot: PlantSnapshot
    /** Lo que cambió respecto de la foto anterior; la escena lo consume una vez por `seq`. */
    events: PlantEvent[]
    seq: number
    slots: SlotMap
    activity: ActivityEntry[]
    updatedAt: number
}

/** Pura: StrictMode puede llamarla dos veces con lo mismo. */
function avanzar(prev: TwinState, next: PlantSnapshot, updatedAt: number): TwinState {
    if (prev.snapshot === next) return prev
    const events = diffPlantSnapshot(prev.snapshot, next)
    const seq = prev.seq + 1
    const nuevas = describeEvents(events, prev.snapshot, next, seq).reverse()
    return {
        snapshot: next,
        events,
        seq,
        slots: assignSlots(prev.slots, next),
        activity: [...nuevas, ...prev.activity].slice(0, ACTIVIDAD_MAX),
        updatedAt,
    }
}

function nivelDe(seleccion: PlantSelection): PlantLevel {
    if (seleccion.weighingId !== null) return 'pesaje'
    if (seleccion.lotId !== null) return 'lote'
    if (seleccion.clientId !== null) return 'cliente'
    return 'planta'
}

/**
 * La planta en vivo para el Mirador: la foto, lo que cambió desde la anterior,
 * el lugar estable de cada cliente y lote, el feed de actividad y la selección.
 *
 * MOCK: hoy la foto sale de `getPlantMockServer()`. Con el endpoint, el interior
 * pasa a ser
 *
 *     const { data, dataUpdatedAt } = useExecuteQuery<PlantSnapshotResponse>(
 *         ['planta', 'en-vivo'], '/plantas/en-vivo',
 *         { refetchInterval: INTERVALO_POLLING_MS, refetchIntervalInBackground: false },
 *     )
 *     useEffect(() => setTwin((prev) => avanzar(prev, data.planta, dataUpdatedAt)), [data, dataUpdatedAt])
 *
 * y el resto del hook no cambia.
 */
export function usePlantTwin() {
    const [twin, setTwin] = useState<TwinState>(() => {
        const snapshot = getPlantMockServer().snapshot().planta
        return { snapshot, events: [], seq: 0, slots: assignSlots(null, snapshot), activity: [], updatedAt: Date.now() }
    })
    const [seleccion, setSeleccion] = useState<PlantSelection>(SIN_SELECCION)

    useEffect(() => {
        const pedir = () => {
            const next = getPlantMockServer().snapshot().planta
            const at = Date.now()
            setTwin((prev) => avanzar(prev, next, at))
        }
        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') pedir()
        }, INTERVALO_POLLING_MS)
        // Al volver a la pestaña se pide enseguida, como `refetchOnWindowFocus`.
        const alVolver = () => { if (document.visibilityState === 'visible') pedir() }
        document.addEventListener('visibilitychange', alVolver)
        return () => {
            window.clearInterval(id)
            document.removeEventListener('visibilitychange', alVolver)
        }
    }, [])

    // Si lo seleccionado ya no está en la foto, la selección sube un nivel.
    const selection = useMemo<PlantSelection>(() => {
        if (seleccion.clientId === null) return SIN_SELECCION
        const cliente = twin.snapshot.clientes.find((c) => c.id === seleccion.clientId)
        if (!cliente) return SIN_SELECCION
        if (seleccion.lotId === null) return { clientId: cliente.id, lotId: null, weighingId: null }
        const lote = cliente.lotes.find((l) => l.id === seleccion.lotId && l.etapa !== 'rechazado')
        if (!lote) return { clientId: cliente.id, lotId: null, weighingId: null }
        return { clientId: cliente.id, lotId: lote.id, weighingId: seleccion.weighingId }
    }, [seleccion, twin.snapshot])

    const select = useCallback((next: Partial<PlantSelection>) => {
        setSeleccion({ clientId: next.clientId ?? null, lotId: next.lotId ?? null, weighingId: next.weighingId ?? null })
    }, [])

    const goUp = useCallback(() => {
        setSeleccion((actual) => {
            if (actual.weighingId !== null) return { ...actual, weighingId: null }
            if (actual.lotId !== null) return { ...actual, lotId: null }
            return SIN_SELECCION
        })
    }, [])

    return {
        snapshot: twin.snapshot,
        events: twin.events,
        seq: twin.seq,
        slots: twin.slots,
        activity: twin.activity,
        updatedAt: twin.updatedAt,
        selection,
        level: nivelDe(selection),
        select,
        goUp,
    }
}

export type PlantTwin = ReturnType<typeof usePlantTwin>
