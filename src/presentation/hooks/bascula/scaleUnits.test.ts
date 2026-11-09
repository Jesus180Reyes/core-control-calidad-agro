import { describe, expect, it } from 'vitest'
import { isUnitMismatch, unitFromLote } from './scaleUnits'

describe('unitFromLote', () => {
    it.each([
        ['LIBRAS', 'lb'],
        ['LB', 'lb'],
        ['Lbs.', 'lb'],
        ['KILOGRAMOS', 'kg'],
        ['kg', 'kg'],
        ['Kilos', 'kg'],
        ['GRAMOS', 'g'],
        ['gr', 'g'],
        ['ONZAS', 'oz'],
        ['oz', 'oz'],
    ] as const)('traduce %j a %s', (texto, unidad) => {
        expect(unitFromLote(texto)).toBe(unidad)
    })

    it('no distingue mayúsculas ni espacios alrededor', () => {
        expect(unitFromLote('  libras ')).toBe('lb')
    })

    it('un texto desconocido devuelve null', () => {
        expect(unitFromLote('QUINTALES')).toBeNull()
        expect(unitFromLote('SACOS')).toBeNull()
    })

    it('sin unidad devuelve null', () => {
        expect(unitFromLote('')).toBeNull()
        expect(unitFromLote(null)).toBeNull()
        expect(unitFromLote(undefined)).toBeNull()
    })
})

describe('isUnitMismatch', () => {
    it('bloquea si las dos unidades se conocen y no coinciden', () => {
        expect(isUnitMismatch('kg', 'lb')).toBe(true)
    })

    it('no bloquea si coinciden', () => {
        expect(isUnitMismatch('lb', 'lb')).toBe(false)
    })

    it('no bloquea si la báscula no informa unidad', () => {
        expect(isUnitMismatch(null, 'lb')).toBe(false)
    })

    it('un texto de lote desconocido no bloquea', () => {
        expect(isUnitMismatch('kg', unitFromLote('QUINTALES'))).toBe(false)
    })

    it('sin ninguna de las dos no bloquea', () => {
        expect(isUnitMismatch(null, null)).toBe(false)
    })
})
