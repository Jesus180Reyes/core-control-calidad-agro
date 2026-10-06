import { qualityLevel } from '#/presentation/hooks/mirador/qualityTarget'
import { STAGE_LABEL, type PlantEvent, type PlantLot, type PlantSnapshot, type QualityLevel } from '#/presentation/types/mirador/plantTwin.types'

export type ActivityTone = QualityLevel | 'etapa' | 'nuevo' | 'salida' | 'rechazo'

export interface ActivityEntry {
    id: string
    /** ISO del servidor. */
    at: string
    tone: ActivityTone
    clientId: number
    clientName: string
    lotName: string | null
    message: string
}

function buscarLote(snapshot: PlantSnapshot, clientId: number, lotId: number): PlantLot | undefined {
    return snapshot.clientes.find((c) => c.id === clientId)?.lotes.find((l) => l.id === lotId)
}

/** Una línea legible por evento, para el feed de actividad. */
export function describeEvents(events: PlantEvent[], prev: PlantSnapshot, next: PlantSnapshot, seq: number): ActivityEntry[] {
    const entradas: ActivityEntry[] = []

    events.forEach((evento, indice) => {
        const cliente = next.clientes.find((c) => c.id === evento.clientId) ?? prev.clientes.find((c) => c.id === evento.clientId)
        if (!cliente) return
        const base = { id: `${seq}-${indice}`, at: next.generado_en, clientId: cliente.id, clientName: cliente.nombre }

        switch (evento.type) {
            case 'weighing-added': {
                const lote = buscarLote(next, evento.clientId, evento.lotId)
                if (!lote) return
                const peso = Number(evento.weighing.peso_neto)
                const nivel = qualityLevel(lote, peso, evento.weighing.fuera_de_rango)
                const texto = nivel === 'ok' ? 'en rango' : nivel === 'desviado' ? 'desviado' : 'fuera de rango'
                entradas.push({ ...base, at: evento.weighing.created_at, tone: nivel, lotName: lote.nombre_lote, message: `+${peso.toFixed(2)} ${lote.unidad_medida} · ${texto}` })
                return
            }
            case 'lot-added': {
                const lote = buscarLote(next, evento.clientId, evento.lotId)
                entradas.push({ ...base, tone: 'nuevo', lotName: lote?.nombre_lote ?? null, message: 'nuevo lote en pesaje' })
                return
            }
            case 'lot-stage-changed': {
                const lote = buscarLote(next, evento.clientId, evento.lotId)
                const extra = evento.to === 'despacho' && lote?.documento_fiscal ? ` con ${lote.documento_fiscal}` : ''
                entradas.push({ ...base, tone: 'etapa', lotName: lote?.nombre_lote ?? null, message: `pasó a ${STAGE_LABEL[evento.to].toLowerCase()}${extra}` })
                return
            }
            case 'lot-removed': {
                const lote = buscarLote(prev, evento.clientId, evento.lotId)
                const rechazo = evento.reason === 'rechazado'
                entradas.push({
                    ...base,
                    tone: rechazo ? 'rechazo' : 'salida',
                    lotName: lote?.nombre_lote ?? null,
                    message: rechazo ? 'lote rechazado' : evento.lastStage === 'despacho' ? 'salió de planta' : 'dejó el tablero',
                })
                return
            }
            case 'weighing-voided': {
                const lote = buscarLote(next, evento.clientId, evento.lotId)
                entradas.push({ ...base, tone: 'rechazo', lotName: lote?.nombre_lote ?? null, message: evento.count === 1 ? 'se anuló un pesaje' : `se anularon ${evento.count} pesajes` })
                return
            }
            case 'client-added':
                entradas.push({ ...base, tone: 'nuevo', lotName: null, message: 'entró a planta' })
                return
            case 'client-removed':
                entradas.push({ ...base, tone: 'salida', lotName: null, message: 'ya no tiene lotes en planta' })
                return
        }
    })

    return entradas
}
