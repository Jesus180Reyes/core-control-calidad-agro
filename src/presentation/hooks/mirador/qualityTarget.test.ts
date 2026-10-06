import { describe, expect, it } from 'vitest'

import { normalizedDeviation, qualityLevel, targetPoint } from './qualityTarget'

const rango = { peso_minimo: '68.60', peso_ideal: '69.00', peso_maximo: '69.50' }

describe('qualityTarget', () => {
    it('normaliza contra el lado que corresponde', () => {
        expect(normalizedDeviation(rango, 69)).toBe(0)
        expect(normalizedDeviation(rango, 69.5)).toBeCloseTo(1)
        expect(normalizedDeviation(rango, 68.6)).toBeCloseTo(-1)
        expect(normalizedDeviation(rango, 69.25)).toBeCloseTo(0.5)
    })

    it('verde, ámbar y rojo por desvío cuando no hay dato del backend', () => {
        expect(qualityLevel(rango, 69.1)).toBe('ok')
        expect(qualityLevel(rango, 69.4)).toBe('desviado')
        expect(qualityLevel(rango, 69.8)).toBe('fuera')
    })

    it('fuera_de_rango del backend manda sobre el desvío', () => {
        expect(qualityLevel(rango, 69.8, 0)).toBe('desviado')
        expect(qualityLevel(rango, 69.0, 1)).toBe('fuera')
    })

    it('los que pesan de más van a la derecha y los de menos a la izquierda', () => {
        expect(targetPoint(rango, 69.3, 7, 100).x).toBeGreaterThan(0)
        expect(targetPoint(rango, 68.7, 7, 100).x).toBeLessThan(0)
    })

    it('el mismo pesaje cae siempre en el mismo lugar', () => {
        expect(targetPoint(rango, 69.3, 45123, 100)).toEqual(targetPoint(rango, 69.3, 45123, 100))
    })
})
