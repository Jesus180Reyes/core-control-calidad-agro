import type { ActiveStage, PlantEvent, PlantLot, PlantSnapshot } from '#/presentation/types/mirador/plantTwin.types'

const esActiva = (etapa: PlantLot['etapa']): etapa is ActiveStage => etapa !== 'rechazado'

/**
 * Lo que cambió entre dos fotos de la planta, en el orden en que la escena lo
 * anima: clientes, lotes y, al final, pesajes del más viejo al más nuevo.
 *
 * Con `prev === null` (la primera carga) devuelve `[]`: lo que ya estaba se
 * pinta en su lugar, no se anima.
 */
export function diffPlantSnapshot(prev: PlantSnapshot | null, next: PlantSnapshot): PlantEvent[] {
    if (!prev) return []

    const clientes: PlantEvent[] = []
    const lotes: PlantEvent[] = []
    const pesajes: Extract<PlantEvent, { type: 'weighing-added' }>[] = []
    const anulados: PlantEvent[] = []

    const prevClientes = new Map(prev.clientes.map((c) => [c.id, c]))
    const nextClientes = new Map(next.clientes.map((c) => [c.id, c]))

    for (const cliente of next.clientes) {
        const anterior = prevClientes.get(cliente.id)
        if (!anterior) {
            clientes.push({ type: 'client-added', clientId: cliente.id })
            // Sus lotes llegan con el territorio: aparecen, no se anuncian uno por uno.
            continue
        }

        const prevLotes = new Map(anterior.lotes.map((l) => [l.id, l]))
        const nextIds = new Set(cliente.lotes.map((l) => l.id))

        for (const lote of cliente.lotes) {
            const antes = prevLotes.get(lote.id)

            if (!antes) {
                if (esActiva(lote.etapa)) lotes.push({ type: 'lot-added', clientId: cliente.id, lotId: lote.id })
                continue
            }

            if (!esActiva(antes.etapa)) continue

            if (!esActiva(lote.etapa)) {
                lotes.push({ type: 'lot-removed', clientId: cliente.id, lotId: lote.id, lastStage: antes.etapa, reason: 'rechazado' })
                continue
            }

            if (antes.etapa !== lote.etapa) {
                lotes.push({ type: 'lot-stage-changed', clientId: cliente.id, lotId: lote.id, from: antes.etapa, to: lote.etapa })
            }

            // Los ids de pesaje son correlativos: un pesaje es nuevo si es más
            // nuevo que todo lo que la ventana anterior ya mostraba. Comparar
            // por pertenencia confundiría al que sale de la ventana con uno nuevo.
            const ultimoVisto = antes.ultimos_pesajes.reduce((max, p) => Math.max(max, p.id), 0)
            for (const pesaje of lote.ultimos_pesajes) {
                if (pesaje.id > ultimoVisto) pesajes.push({ type: 'weighing-added', clientId: cliente.id, lotId: lote.id, weighing: pesaje })
            }

            const nuevos = lote.ultimos_pesajes.filter((p) => p.id > ultimoVisto).length
            const faltan = antes.bultos + nuevos - lote.bultos
            if (faltan > 0) anulados.push({ type: 'weighing-voided', clientId: cliente.id, lotId: lote.id, count: faltan })
        }

        for (const antes of anterior.lotes) {
            if (!nextIds.has(antes.id) && esActiva(antes.etapa)) {
                lotes.push({ type: 'lot-removed', clientId: cliente.id, lotId: antes.id, lastStage: antes.etapa, reason: 'salida' })
            }
        }
    }

    for (const anterior of prev.clientes) {
        if (!nextClientes.has(anterior.id)) clientes.push({ type: 'client-removed', clientId: anterior.id })
    }

    pesajes.sort((a, b) => a.weighing.id - b.weighing.id)

    return [...clientes, ...lotes, ...pesajes, ...anulados]
}
