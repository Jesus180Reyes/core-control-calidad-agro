import { describe, expect, it } from 'vitest'

import type { PlantClient, PlantEvent, PlantLot, PlantSnapshot, PlantStage, PlantWeighing, SlotMap } from '#/presentation/types/mirador/plantTwin.types'

import { buildTourStops, nextTourStop, pickTourAlert, type TourStop } from './plantTour'

const lote = (id: number, etapa: PlantStage): PlantLot => ({
    id, nombre_lote: `L-${id}`, producto: 'Café oro', unidad_medida: 'kg', etapa,
    peso_minimo: '68.60', peso_ideal: '69.00', peso_maximo: '69.50',
    bultos: 0, bultos_fuera_rango: 0, peso_neto_total: 0, ultimos_pesajes: [],
})

const cliente = (id: number, lotes: PlantLot[]): PlantClient => ({ id, nombre: `C-${id}`, producto: null, codigo_exportacion: null, lotes })

const foto = (clientes: PlantClient[]): PlantSnapshot => ({
    generado_en: '2026-10-21T10:00:00Z',
    kpis: { pesajes_hoy: 0, peso_neto_hoy: 0, pct_en_rango_hoy: null, lotes_activos: 0, clientes_con_actividad_hoy: 0 },
    clientes,
})

const filas = (rows: SlotMap['rows']): SlotMap => ({ rows, lots: {}, overflow: {} })

const pesaje = (id: number, fuera_de_rango: boolean): PlantWeighing => ({
    id, peso_neto: '69.00', fuera_de_rango, estado_calidad_codigo: null, usuario: 'op', created_at: '2026-10-21T10:00:00Z',
})

const agregado = (clientId: number, lotId: number, weighing: PlantWeighing): PlantEvent => ({ type: 'weighing-added', clientId, lotId, weighing })

const planta: TourStop = { kind: 'planta' }
const parada = (clientId: number): TourStop => ({ kind: 'cliente', clientId })

describe('buildTourStops', () => {
    it('arranca en la planta y sigue con los clientes en el orden de sus filas', () => {
        const stops = buildTourStops(
            foto([cliente(1, [lote(10, 'en-pesaje')]), cliente(2, [lote(20, 'por-aprobar')]), cliente(3, [lote(30, 'en-pesaje')])]),
            filas({ 1: 2, 2: 0, 3: 1 }),
        )
        expect(stops).toEqual([planta, parada(2), parada(3), parada(1)])
    })

    it('un cliente con sólo lotes finalizados queda afuera', () => {
        const stops = buildTourStops(
            foto([cliente(1, [lote(10, 'finalizado'), lote(11, 'finalizado')]), cliente(2, [lote(20, 'finalizado'), lote(21, 'en-pesaje')])]),
            filas({ 1: 0, 2: 1 }),
        )
        expect(stops).toEqual([planta, parada(2)])
    })

    it('un cliente sin fila no entra', () => {
        const stops = buildTourStops(foto([cliente(1, [lote(10, 'en-pesaje')])]), filas({}))
        expect(stops).toEqual([planta])
    })

    it('sin clientes activos, la lista es sólo la planta', () => {
        const stops = buildTourStops(foto([cliente(1, [lote(10, 'finalizado')]), cliente(2, [])]), filas({ 1: 0, 2: 1 }))
        expect(stops).toEqual([planta])
    })
})

describe('nextTourStop', () => {
    const stops = [planta, parada(2), parada(3), parada(1)]
    const rows = { 2: 0, 3: 1, 1: 2 }

    it('sin parada actual, arranca en la planta', () => {
        expect(nextTourStop(stops, null, rows)).toEqual(planta)
    })

    it('de la planta pasa al primer cliente', () => {
        expect(nextTourStop(stops, planta, rows)).toEqual(parada(2))
    })

    it('busca la parada actual por cliente y devuelve la siguiente', () => {
        expect(nextTourStop(stops, parada(3), rows)).toEqual(parada(1))
    })

    it('después del último cliente vuelve a la planta', () => {
        expect(nextTourStop(stops, parada(1), rows)).toEqual(planta)
    })

    it('sin clientes, de la planta vuelve a la planta', () => {
        expect(nextTourStop([planta], planta, {})).toEqual(planta)
    })

    it('un cliente que salió de la foto hace seguir con el siguiente por fila', () => {
        // El 3 estaba en la fila 1 y ya no está ni en la lista ni en las filas.
        const sinEl3 = [planta, parada(2), parada(1)]
        expect(nextTourStop(sinEl3, parada(3), { 2: 0, 1: 2 }, 1)).toEqual(parada(1))
    })

    it('un cliente que ya no tiene lotes activos usa su fila de la foto', () => {
        const sinEl3 = [planta, parada(2), parada(1)]
        expect(nextTourStop(sinEl3, parada(3), rows)).toEqual(parada(1))
    })

    it('si el cliente que salió era el último por fila, vuelve a la planta', () => {
        const sinEl1 = [planta, parada(2), parada(3)]
        expect(nextTourStop(sinEl1, parada(1), { 2: 0, 3: 1 }, 2)).toEqual(planta)
    })

    it('si no se conoce la fila del cliente que salió, vuelve a la planta', () => {
        expect(nextTourStop(stops, parada(9), rows)).toEqual(planta)
    })
})

describe('pickTourAlert', () => {
    it('elige un solo pesaje fuera de rango por foto, el de mayor id', () => {
        const alerta = pickTourAlert([
            agregado(1, 10, pesaje(101, true)),
            agregado(2, 20, pesaje(105, true)),
            agregado(1, 10, pesaje(103, true)),
            agregado(1, 10, pesaje(108, false)),
        ])
        expect(alerta).toEqual({ clientId: 2, lotId: 20, weighingId: 105 })
    })

    it('sin pesajes fuera de rango no hay alerta', () => {
        const alerta = pickTourAlert([
            agregado(1, 10, pesaje(101, false)),
            { type: 'lot-added', clientId: 1, lotId: 11 },
            { type: 'lot-removed', clientId: 1, lotId: 12, lastStage: 'por-aprobar', reason: 'rechazado' },
        ])
        expect(alerta).toBeNull()
    })

    it('sin eventos no hay alerta', () => {
        expect(pickTourAlert([])).toBeNull()
    })
})
