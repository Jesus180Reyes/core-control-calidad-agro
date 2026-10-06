import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Query } from '@tanstack/react-query'

import { assignSlots } from '#/presentation/hooks/mirador/assignSlots'
import { describeEvents, type ActivityEntry } from '#/presentation/hooks/mirador/describeEvents'
import { diffPlantSnapshot } from '#/presentation/hooks/mirador/diffPlantSnapshot'
import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { PlantEvent, PlantLevel, PlantSelection, PlantSnapshot, PlantSnapshotResponse, SlotMap } from '#/presentation/types/mirador/plantTwin.types'

/**
 * Base del intervalo; a cada pedido se le suma un desfase. Acordado con el
 * backend (SPEC 32): nunca más de 2 min entre fotos, porque un lote rechazado
 * viaja sólo 5 min; y no bajarlo sin hablarlo allá, que no tiene caché.
 */
export const INTERVALO_POLLING_MS = 75_000

/** Hasta este desfase extra, para que las pantallas no pidan todas a la vez. */
export const DESFASE_POLLING_MS = 30_000

/** Sin foto nueva en este tiempo, el indicador "en vivo" avisa. Más de dos intervalos máximos. */
export const FOTO_VIEJA_MS = 4 * 60_000

/**
 * 75–105 s. El desfase sale de la hora del último pedido y no de `Math.random()`:
 * React Query recalcula esto en cada render y reinicia el timer si el valor
 * cambia, así que tiene que ser estable entre renders y cambiar entre pedidos.
 */
function intervalo(query: Query<PlantSnapshotResponse>) {
    const ultimo = Math.max(query.state.dataUpdatedAt, query.state.errorUpdatedAt)
    return INTERVALO_POLLING_MS + (ultimo % DESFASE_POLLING_MS)
}

const ACTIVIDAD_MAX = 40

const SIN_SELECCION: PlantSelection = { clientId: null, lotId: null, weighingId: null }

interface TwinState {
    snapshot: PlantSnapshot
    /** Lo que cambió respecto de la foto anterior; la escena lo consume una vez por `seq`. */
    events: PlantEvent[]
    seq: number
    slots: SlotMap
    activity: ActivityEntry[]
}

/** Pura: StrictMode puede llamarla dos veces con lo mismo. */
function avanzar(prev: TwinState, next: PlantSnapshot): TwinState {
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
 * La foto sale de `GET /plantas/en-vivo`, que no manda eventos: el diff lo hace
 * `diffPlantSnapshot`. Se pide sólo con la pestaña visible, y al volver a ella
 * se pide enseguida. Usa `useSuspenseQuery`: lo cubren el `<Suspense>` y el
 * `ErrorBoundary` del layout del portal. Un refetch que falla no lo dispara
 * (ya hay datos): la escena se queda con la última foto y el indicador "en
 * vivo" avisa cuando pasa `FOTO_VIEJA_MS`.
 */
export function usePlantTwin() {
    const { data, dataUpdatedAt } = useExecuteQuery<PlantSnapshotResponse>(['planta', 'en-vivo'], '/plantas/en-vivo', {
        refetchInterval: intervalo,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        staleTime: 0,
    })

    const [twin, setTwin] = useState<TwinState>(() => ({
        snapshot: data.planta, events: [], seq: 0, slots: assignSlots(null, data.planta), activity: [],
    }))
    const [seleccion, setSeleccion] = useState<PlantSelection>(SIN_SELECCION)

    // `structuralSharing` devuelve la misma referencia si el JSON no cambió:
    // una foto idéntica no genera eventos.
    useEffect(() => setTwin((prev) => avanzar(prev, data.planta)), [data])

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
        // Del pedido, no de la foto: una foto idéntica también dice que la planta responde.
        updatedAt: dataUpdatedAt,
        selection,
        level: nivelDe(selection),
        select,
        goUp,
    }
}

export type PlantTwin = ReturnType<typeof usePlantTwin>
