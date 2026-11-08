import { describe, expect, it } from 'vitest'
import {
    DEFAULT_SCALE_PROFILE,
    UMBRAL_CONFIANZA,
    UMBRAL_MINIMO,
    scoreSample,
    toSerialOptions,
} from './scaleDetection'

const STX = '\x02'

const bytesOf = (text: string): Uint8Array =>
    Uint8Array.from(text, (char) => char.charCodeAt(0))

const withEvenParity = (bytes: Uint8Array): Uint8Array =>
    bytes.map((byte) => {
        let ones = 0
        for (let bit = 0; bit < 7; bit++) ones += (byte >> bit) & 1
        return ones % 2 === 0 ? byte : byte | 0x80
    })

const repeat = (frame: string, times: number) => Array.from({ length: times }, () => frame).join('')

const randomBytes = (seed: number, length: number): Uint8Array => {
    let state = seed
    return Uint8Array.from({ length }, () => {
        state = (state * 1103515245 + 12345) % 2 ** 31
        return state & 0xff
    })
}

describe('toSerialOptions', () => {
    it('8N1 es 8 bits sin paridad', () => {
        expect(toSerialOptions({ baudRate: 9600, byteFormat: '8N1' })).toEqual({
            baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1, flowControl: 'none',
        })
    })

    it('7E1 y 7O1 son 7 bits con paridad par e impar', () => {
        expect(toSerialOptions({ baudRate: 2400, byteFormat: '7E1' })).toMatchObject({ dataBits: 7, parity: 'even' })
        expect(toSerialOptions({ baudRate: 2400, byteFormat: '7O1' })).toMatchObject({ dataBits: 7, parity: 'odd' })
    })

    it('el perfil por defecto es el comportamiento de hoy', () => {
        expect(toSerialOptions(DEFAULT_SCALE_PROFILE)).toEqual({
            baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1, flowControl: 'none',
        })
        expect(DEFAULT_SCALE_PROFILE).toMatchObject({ mode: 'continuo', frameFormat: 'texto', terminator: '\r\n' })
    })
})

describe('scoreSample — muestras buenas', () => {
    it('texto con unidad puntúa por encima de la confianza', () => {
        const resultado = scoreSample(bytesOf(repeat('ST,GS,+00012.34 kg\r\n', 8)), '8N1')
        expect(resultado).not.toBeNull()
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
        expect(resultado).toMatchObject({ frameFormat: 'texto', terminator: '\r\n', unit: 'kg', lastWeight: 12.34 })
    })

    it('texto sin unidad deja la unidad en null', () => {
        const resultado = scoreSample(bytesOf(repeat('  105.0\r', 6)), '8N1')
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
        expect(resultado).toMatchObject({ frameFormat: 'texto', terminator: '\r', unit: null, lastWeight: 105 })
    })

    it('invertido puntúa por encima de la confianza y se reconoce antes que texto', () => {
        const resultado = scoreSample(bytesOf(repeat('=0.0510\r\n', 6)), '8N1')
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
        expect(resultado).toMatchObject({ frameFormat: 'invertido', lastWeight: 150 })
    })

    it('toledo continuo puntúa por encima de la confianza', () => {
        const trama = `${STX}$0 001234000000\r`
        const resultado = scoreSample(bytesOf(repeat(trama, 6)), '8N1')
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
        expect(resultado).toMatchObject({ frameFormat: 'toledo-continuo', terminator: '\r', unit: 'kg', lastWeight: 12.34 })
    })

    it('la plataforma vacía también es una muestra buena', () => {
        const resultado = scoreSample(bytesOf(repeat('   0.00 lb\r\n', 5)), '8N1')
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
        expect(resultado).toMatchObject({ lastWeight: 0, unit: 'lb' })
    })

    it('una primera trama cortada no castiga el puntaje', () => {
        const resultado = scoreSample(bytesOf('kg\r\n' + repeat('  12.30 kg\r\n', 5)), '8N1')
        expect(resultado!.score).toBeGreaterThan(UMBRAL_CONFIANZA)
    })

    it('una muestra 7E1 se lee bien como 7E1 y mal como 8N1', () => {
        const bytes = withEvenParity(bytesOf(repeat('ST,GS,+00012.34 kg\r\n', 8)))
        expect(scoreSample(bytes, '7E1')!.score).toBeGreaterThan(UMBRAL_CONFIANZA)

        const como8N1 = scoreSample(bytes, '8N1')
        expect(como8N1 === null || como8N1.score < UMBRAL_MINIMO).toBe(true)
    })
})

describe('scoreSample — muestras malas', () => {
    it.each([1, 7, 42, 1234, 99999])('bytes al azar (semilla %i) puntúan por debajo del mínimo', (seed) => {
        const resultado = scoreSample(randomBytes(seed, 600), '8N1')
        expect(resultado === null || resultado.score < UMBRAL_MINIMO).toBe(true)
    })

    it('menos de 3 tramas válidas devuelve null', () => {
        expect(scoreSample(bytesOf('  12.34 kg\r\n  12.34 kg\r\n'), '8N1')).toBeNull()
    })

    it('una muestra vacía devuelve null', () => {
        expect(scoreSample(new Uint8Array(), '8N1')).toBeNull()
    })

    it('tramas sin números devuelven null', () => {
        expect(scoreSample(bytesOf(repeat('ERR\r\n', 6)), '8N1')).toBeNull()
    })
})
