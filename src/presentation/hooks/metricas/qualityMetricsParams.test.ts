import { describe, expect, it } from 'vitest'
import { buildQualityMetricsParams } from './qualityMetricsParams'
import type { PeriodPreset } from './qualityMetricsParams'

// 9 de octubre de 2026, local. A las 23:30 para que un toISOString() se corriera de día.
const HOY = new Date(2026, 9, 9, 23, 30)

describe('buildQualityMetricsParams', () => {
    it('30d no manda fechas: el default es del backend', () => {
        expect(buildQualityMetricsParams({ preset: '30d' }, HOY)).toEqual({})
    })

    it('7d y 90d mandan sólo desde, con hoy incluido', () => {
        expect(buildQualityMetricsParams({ preset: '7d' }, HOY)).toEqual({ desde: '2026-10-03' })
        expect(buildQualityMetricsParams({ preset: '90d' }, HOY)).toEqual({ desde: '2026-07-12' })
    })

    it('month manda el día 1 del mes actual', () => {
        expect(buildQualityMetricsParams({ preset: 'month' }, HOY)).toEqual({ desde: '2026-10-01' })
    })

    it('custom con las dos fechas manda las dos', () => {
        const params = buildQualityMetricsParams(
            { preset: 'custom', desde: new Date(2026, 8, 1), hasta: new Date(2026, 8, 15) },
            HOY,
        )
        expect(params).toEqual({ desde: '2026-09-01', hasta: '2026-09-15' })
    })

    it('custom con sólo hasta manda sólo hasta', () => {
        const params = buildQualityMetricsParams({ preset: 'custom', hasta: new Date(2026, 8, 15) }, HOY)
        expect(params).toEqual({ hasta: '2026-09-15' })
    })

    it('custom sin fechas equivale a 30d', () => {
        expect(buildQualityMetricsParams({ preset: 'custom' }, HOY)).toEqual({})
    })

    it('cliente_id y usuario_id pasan tal cual', () => {
        const params = buildQualityMetricsParams({ preset: '30d', cliente_id: 40, usuario_id: 7 }, HOY)
        expect(params).toEqual({ cliente_id: 40, usuario_id: 7 })
    })

    it('undefined no genera la clave', () => {
        const params = buildQualityMetricsParams(
            { preset: 'custom', desde: undefined, hasta: undefined, cliente_id: undefined, usuario_id: undefined },
            HOY,
        )
        expect(Object.keys(params)).toEqual([])
    })

    it('ningún preset manda hasta', () => {
        const presets: PeriodPreset[] = ['7d', '30d', '90d', 'month']
        for (const preset of presets) {
            expect(buildQualityMetricsParams({ preset }, HOY)).not.toHaveProperty('hasta')
        }
    })
})
