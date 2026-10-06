import { describe, expect, it } from 'vitest'

import type { PlantClient, PlantLot, PlantSnapshot, PlantStage } from '#/presentation/types/mirador/plantTwin.types'

import { assignSlots } from './assignSlots'

const lote = (id: number, etapa: PlantStage): PlantLot => ({
    id, nombre_lote: `L-${id}`, producto: 'Café oro', unidad_medida: 'kg', etapa,
    peso_minimo: '68.60', peso_ideal: '69.00', peso_maximo: '69.50',
    bultos: 0, bultos_fuera_rango: 0, peso_neto_total: 0, documento_fiscal: null, ultimos_pesajes: [],
})

const cliente = (id: number, nombre: string, lotes: PlantLot[]): PlantClient => ({ id, nombre, producto: null, codigo_exportacion: null, lotes })

const foto = (clientes: PlantClient[]): PlantSnapshot => ({
    generado_en: '2026-10-05T10:00:00Z',
    kpis: { pesajes_hoy: 0, peso_neto_hoy: 0, pct_en_rango_hoy: null, lotes_activos: 0, clientes_con_actividad_hoy: 0 },
    clientes,
})

describe('assignSlots', () => {
    it('en la primera carga, los clientes más activos van arriba', () => {
        const slots = assignSlots(null, foto([
            cliente(1, 'Quieto', [lote(10, 'finalizado')]),
            cliente(2, 'Activo', [lote(20, 'en-pesaje'), lote(21, 'por-aprobar')]),
        ]))
        expect(slots.rows).toEqual({ 2: 0, 1: 1 })
    })

    it('un lote conserva su slot aunque otros entren o salgan de su casilla', () => {
        const a = assignSlots(null, foto([cliente(1, 'A', [lote(10, 'en-pesaje'), lote(11, 'en-pesaje'), lote(12, 'en-pesaje')])]))
        expect(a.lots[12]).toEqual({ stage: 'en-pesaje', slot: 2 })
        const b = assignSlots(a, foto([cliente(1, 'A', [lote(12, 'en-pesaje'), lote(13, 'en-pesaje')])]))
        expect(b.lots[12]).toEqual({ stage: 'en-pesaje', slot: 2 })
        // El que llega ocupa el primer lugar libre.
        expect(b.lots[13]).toEqual({ stage: 'en-pesaje', slot: 0 })
    })

    it('un lote que cambia de etapa toma un slot en la casilla nueva', () => {
        const a = assignSlots(null, foto([cliente(1, 'A', [lote(10, 'en-pesaje'), lote(11, 'por-aprobar')])]))
        const b = assignSlots(a, foto([cliente(1, 'A', [lote(10, 'por-aprobar'), lote(11, 'por-aprobar')])]))
        expect(b.lots[11]).toEqual({ stage: 'por-aprobar', slot: 0 })
        expect(b.lots[10]).toEqual({ stage: 'por-aprobar', slot: 1 })
    })

    it('finalizado deja la columna derecha para el camión: sólo slots 0 y 2', () => {
        const slots = assignSlots(null, foto([cliente(1, 'A', [lote(10, 'finalizado'), lote(11, 'finalizado'), lote(12, 'finalizado')])]))
        expect(slots.lots[10]).toEqual({ stage: 'finalizado', slot: 0 })
        expect(slots.lots[11]).toEqual({ stage: 'finalizado', slot: 2 })
        expect(slots.lots[12]).toBeUndefined()
        expect(slots.overflow[1]).toEqual({ finalizado: 1 })
    })

    it('los lotes rechazados no ocupan lugar', () => {
        const slots = assignSlots(null, foto([cliente(1, 'A', [lote(10, 'rechazado')])]))
        expect(slots.lots[10]).toBeUndefined()
    })

    it('las filas se conservan, y un cliente nuevo ocupa la primera libre', () => {
        const a = assignSlots(null, foto([cliente(1, 'A', [lote(10, 'en-pesaje')]), cliente(2, 'B', [lote(20, 'en-pesaje')]), cliente(3, 'C', [])]))
        const filaDe3 = a.rows[3]
        const b = assignSlots(a, foto([cliente(3, 'C', []), cliente(4, 'D', [])]))
        expect(b.rows[3]).toBe(filaDe3)
        expect(b.rows[4]).toBe(0)
    })
})
