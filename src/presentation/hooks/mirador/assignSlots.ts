import { ACTIVE_STAGES, type ActiveStage, type PlantClient, type PlantSnapshot, type SlotMap } from '#/presentation/types/mirador/plantTwin.types'

/**
 * Slots de cada casilla, en orden de llenado: atrás-izquierda, atrás-derecha,
 * adelante-izquierda, adelante-derecha. En despacho la columna derecha es del
 * camión, así que sólo entran dos contenedores.
 */
export const STAGE_SLOTS: Record<ActiveStage, number[]> = {
    'en-pesaje': [0, 1, 2, 3],
    'por-aprobar': [0, 1, 2, 3],
    'despacho': [0, 2],
}

function actividad(cliente: PlantClient): number {
    return cliente.lotes.reduce((total, lote) => total + (lote.etapa === 'en-pesaje' || lote.etapa === 'por-aprobar' ? 1 : 0), 0)
}

/**
 * Asigna una fila a cada cliente y un slot a cada lote, conservando el lugar de
 * todo lo que ya tenía uno: nada se reordena entre dos fotos. Lo que sale libera
 * su lugar y lo que entra ocupa el primero libre. Un lote que no entra en su
 * casilla no recibe slot y se cuenta en `overflow`.
 */
export function assignSlots(prev: SlotMap | null, snapshot: PlantSnapshot): SlotMap {
    const rows: SlotMap['rows'] = {}
    const lots: SlotMap['lots'] = {}
    const overflow: SlotMap['overflow'] = {}

    // Filas: en la primera carga, los más activos arriba; después, cada uno conserva la suya.
    const clientes = prev
        ? snapshot.clientes
        : [...snapshot.clientes].sort((a, b) => actividad(b) - actividad(a) || a.nombre.localeCompare(b.nombre))

    const filasUsadas = new Set<number>()
    for (const cliente of clientes) {
        const fila = prev?.rows[cliente.id]
        if (fila !== undefined) { rows[cliente.id] = fila; filasUsadas.add(fila) }
    }
    for (const cliente of clientes) {
        if (rows[cliente.id] !== undefined) continue
        let fila = 0
        while (filasUsadas.has(fila)) fila++
        rows[cliente.id] = fila; filasUsadas.add(fila)
    }

    // Slots: primero los que conservan su lugar, después los que llegan, por id.
    for (const cliente of snapshot.clientes) {
        for (const etapa of ACTIVE_STAGES) {
            const enCasilla = cliente.lotes.filter((l) => l.etapa === etapa).sort((a, b) => a.id - b.id)
            const ocupados = new Set<number>()
            const pendientes: number[] = []

            for (const lote of enCasilla) {
                const antes = prev?.lots[lote.id]
                if (antes && antes.stage === etapa && !ocupados.has(antes.slot)) {
                    lots[lote.id] = { stage: etapa, slot: antes.slot }; ocupados.add(antes.slot)
                } else {
                    pendientes.push(lote.id)
                }
            }

            let sinLugar = 0
            for (const id of pendientes) {
                const libre = STAGE_SLOTS[etapa].find((s) => !ocupados.has(s))
                if (libre === undefined) { sinLugar++; continue }
                lots[id] = { stage: etapa, slot: libre }; ocupados.add(libre)
            }

            if (sinLugar > 0) (overflow[cliente.id] ??= {})[etapa] = sinLugar
        }
    }

    return { rows, lots, overflow }
}
