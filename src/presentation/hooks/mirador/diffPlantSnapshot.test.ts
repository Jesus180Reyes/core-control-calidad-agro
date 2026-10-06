import { describe, expect, it } from 'vitest'

import type { PlantClient, PlantLot, PlantSnapshot, PlantStage, PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

import { diffPlantSnapshot } from './diffPlantSnapshot'

const pesaje = (id: number, fuera = 0): PlantWeighing => ({
    id, peso_neto: '69.00', fuera_de_rango: fuera, estado_calidad_codigo: 'EN_RANGO', usuario: 'M. Castillo', created_at: `2026-10-05T10:00:${String(id % 60).padStart(2, '0')}Z`,
})

const lote = (id: number, etapa: PlantStage, pesajes: number[] = [], extra: Partial<PlantLot> = {}): PlantLot => ({
    id, nombre_lote: `L-${id}`, producto: 'Café oro', unidad_medida: 'kg', etapa,
    peso_minimo: '68.60', peso_ideal: '69.00', peso_maximo: '69.50',
    bultos: pesajes.length, bultos_fuera_rango: 0, peso_neto_total: pesajes.length * 69, documento_fiscal: null,
    ultimos_pesajes: pesajes.slice().sort((a, b) => b - a).slice(0, 10).map((p) => pesaje(p)),
    ...extra,
})

const cliente = (id: number, lotes: PlantLot[]): PlantClient => ({ id, nombre: `Cliente ${id}`, producto: 'Café oro', codigo_exportacion: null, lotes })

const foto = (clientes: PlantClient[]): PlantSnapshot => ({
    generado_en: '2026-10-05T10:00:00Z',
    kpis: { pesajes_hoy: 0, peso_neto_hoy: 0, pct_en_rango_hoy: null, lotes_activos: 0, clientes_con_actividad_hoy: 0 },
    clientes,
})

describe('diffPlantSnapshot', () => {
    it('la primera carga no anima nada', () => {
        expect(diffPlantSnapshot(null, foto([cliente(1, [lote(10, 'en-pesaje', [1, 2])])]))).toEqual([])
    })

    it('dos fotos iguales no producen eventos', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2])])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2])])])
        expect(diffPlantSnapshot(a, b)).toEqual([])
    })

    it('un pesaje nuevo produce exactamente un weighing-added en su lote', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2]), lote(11, 'en-pesaje', [3])])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2, 4]), lote(11, 'en-pesaje', [3])])])
        const eventos = diffPlantSnapshot(a, b)
        expect(eventos).toHaveLength(1)
        expect(eventos[0]).toMatchObject({ type: 'weighing-added', clientId: 1, lotId: 10, weighing: { id: 4 } })
    })

    it('un pesaje que sale de la ventana de 10 no se confunde con uno nuevo', () => {
        const antes = Array.from({ length: 12 }, (_, i) => i + 1)
        const a = foto([cliente(1, [lote(10, 'en-pesaje', antes)])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [...antes, 13])])])
        const eventos = diffPlantSnapshot(a, b)
        expect(eventos.map((e) => e.type)).toEqual(['weighing-added'])
    })

    it('los pesajes salen ordenados del más viejo al más nuevo, entre lotes', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1]), lote(11, 'en-pesaje', [2])])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [1, 5]), lote(11, 'en-pesaje', [2, 4])])])
        const ids = diffPlantSnapshot(a, b).flatMap((e) => (e.type === 'weighing-added' ? [e.weighing.id] : []))
        expect(ids).toEqual([4, 5])
    })

    it('un cambio de etapa produce lot-stage-changed', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1])])])
        const b = foto([cliente(1, [lote(10, 'por-aprobar', [1])])])
        expect(diffPlantSnapshot(a, b)).toEqual([{ type: 'lot-stage-changed', clientId: 1, lotId: 10, from: 'en-pesaje', to: 'por-aprobar' }])
    })

    it('un lote nuevo produce lot-added y no anuncia sus pesajes', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1])])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [1]), lote(11, 'en-pesaje', [2, 3])])])
        expect(diffPlantSnapshot(a, b)).toEqual([{ type: 'lot-added', clientId: 1, lotId: 11 }])
    })

    it('un lote que desaparece sale, y uno rechazado sale como rechazo', () => {
        const a = foto([cliente(1, [lote(10, 'finalizado'), lote(11, 'en-pesaje', [1])])])
        const b = foto([cliente(1, [lote(11, 'rechazado', [1])])])
        expect(diffPlantSnapshot(a, b)).toEqual([
            { type: 'lot-removed', clientId: 1, lotId: 11, lastStage: 'en-pesaje', reason: 'rechazado' },
            { type: 'lot-removed', clientId: 1, lotId: 10, lastStage: 'finalizado', reason: 'salida' },
        ])
    })

    it('un lote rechazado que sigue en la foto no vuelve a producir eventos', () => {
        const a = foto([cliente(1, [lote(11, 'rechazado', [1])])])
        const b = foto([cliente(1, [lote(11, 'rechazado', [1])])])
        expect(diffPlantSnapshot(a, b)).toEqual([])
    })

    it('si bajan los bultos, avisa cuántos pesajes se anularon', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2, 3])])])
        const b = foto([cliente(1, [lote(10, 'en-pesaje', [1, 2])])])
        expect(diffPlantSnapshot(a, b)).toEqual([{ type: 'weighing-voided', clientId: 1, lotId: 10, count: 1 }])
    })

    it('clientes que entran y salen', () => {
        const a = foto([cliente(1, [lote(10, 'en-pesaje')])])
        const b = foto([cliente(2, [lote(20, 'en-pesaje')])])
        expect(diffPlantSnapshot(a, b)).toEqual([
            { type: 'client-added', clientId: 2 },
            { type: 'client-removed', clientId: 1 },
        ])
    })
})
