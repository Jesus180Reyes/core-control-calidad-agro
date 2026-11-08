import { describe, expect, it } from 'vitest'
import { parseFrame, splitFrames } from './scaleFrameParser'

const STX = '\x02'

const toledo = (statusA: string, statusB: string, statusC: string, peso: string, tara = '000000') =>
    `${STX}${statusA}${statusB}${statusC}${peso}${tara}`

describe('splitFrames', () => {
    it('corta por el terminador y devuelve el resto incompleto', () => {
        expect(splitFrames('12.34 kg\r\n12.35 kg\r\n12.3', '\r\n')).toEqual({
            frames: ['12.34 kg', '12.35 kg'],
            rest: '12.3',
        })
    })

    it('descarta las tramas vacías entre terminadores seguidos', () => {
        expect(splitFrames('1\r\r2\r', '\r')).toEqual({ frames: ['1', '2'], rest: '' })
    })

    it('corta por ETX', () => {
        expect(splitFrames(`${STX}10.0\x03${STX}10.1\x03`, '\x03')).toEqual({
            frames: [`${STX}10.0`, `${STX}10.1`],
            rest: '',
        })
    })
})

describe('parseFrame — texto', () => {
    it('lee el peso con unidad', () => {
        expect(parseFrame('   12.34 kg', 'texto')).toEqual({ peso: 12.34, unidad: 'kg' })
    })

    it('lee el peso sin unidad', () => {
        expect(parseFrame('0012.50', 'texto')).toEqual({ peso: 12.5, unidad: null })
    })

    it('tolera coma decimal y espacio entre el signo y el valor', () => {
        expect(parseFrame('+ 0012,34 lb', 'texto')).toEqual({ peso: 12.34, unidad: 'lb' })
    })

    it('lee el signo negativo', () => {
        expect(parseFrame('-0001.20 LB', 'texto')).toEqual({ peso: -1.2, unidad: 'lb' })
    })

    it('reconoce lbs, oz y g', () => {
        expect(parseFrame('25.5 lbs', 'texto').unidad).toBe('lb')
        expect(parseFrame('16.0 oz', 'texto').unidad).toBe('oz')
        expect(parseFrame('500 g', 'texto').unidad).toBe('g')
    })

    it('con etiqueta GS toma el bruto aunque no sea el primer número', () => {
        expect(parseFrame('ST,NT,+00010.00 kg T 2.34 GS,+00012.34 kg', 'texto')).toEqual({
            peso: 12.34,
            unidad: 'kg',
        })
    })

    it('con etiqueta G toma el número que la acompaña', () => {
        expect(parseFrame('N 10.00 T 2.00 G 12.00 lb', 'texto')).toEqual({ peso: 12, unidad: 'lb' })
    })

    it('con etiqueta GROSS toma el número que la acompaña', () => {
        expect(parseFrame('NET 8.0 GROSS: 9.5 kg', 'texto')).toEqual({ peso: 9.5, unidad: 'kg' })
    })

    it('con etiqueta B toma el número que la acompaña', () => {
        expect(parseFrame('T 1.00 B 7.25', 'texto')).toEqual({ peso: 7.25, unidad: null })
    })

    it('la G de gramos después del número es unidad, no etiqueta', () => {
        expect(parseFrame('250 g', 'texto')).toEqual({ peso: 250, unidad: 'g' })
    })

    it('ignora los caracteres de control', () => {
        expect(parseFrame(`${STX}  0.00 kg\x03`, 'texto')).toEqual({ peso: 0, unidad: 'kg' })
    })

    it('una trama sin números no da peso', () => {
        expect(parseFrame('ERR OL', 'texto')).toEqual({ peso: null, unidad: null })
    })
})

describe('parseFrame — invertido', () => {
    it('lee el número al revés', () => {
        expect(parseFrame('=0.0510', 'invertido')).toEqual({ peso: 150, unidad: null })
    })

    it('lee un peso con decimales y ceros a la izquierda', () => {
        expect(parseFrame('=54.32100', 'invertido')).toEqual({ peso: 123.45, unidad: null })
    })

    it('lee el signo negativo que llega al final', () => {
        expect(parseFrame('=0.0510-', 'invertido')).toEqual({ peso: -150, unidad: null })
    })

    it('una trama sin = no es invertida', () => {
        expect(parseFrame('0.0510', 'invertido')).toEqual({ peso: null, unidad: null })
    })

    it('una trama con letras no es invertida', () => {
        expect(parseFrame('=0.05kg', 'invertido')).toEqual({ peso: null, unidad: null })
    })
})

describe('parseFrame — toledo-continuo', () => {
    it('lee el decimal implícito del byte de estado A y los kg del byte B', () => {
        expect(parseFrame(toledo('$', '0', ' ', '001234'), 'toledo-continuo')).toEqual({
            peso: 12.34,
            unidad: 'kg',
        })
    })

    it('lee el signo negativo del byte de estado B', () => {
        expect(parseFrame(toledo('$', '2', ' ', '001234'), 'toledo-continuo')).toEqual({
            peso: -12.34,
            unidad: 'kg',
        })
    })

    it('sin el bit de kg la unidad es lb', () => {
        expect(parseFrame(toledo('#', ' ', ' ', '000105'), 'toledo-continuo')).toEqual({
            peso: 10.5,
            unidad: 'lb',
        })
    })

    it('sin decimales y con factor de 10', () => {
        expect(parseFrame(toledo('"', ' ', ' ', '001234'), 'toledo-continuo').peso).toBe(1234)
        expect(parseFrame(toledo('!', ' ', ' ', '001234'), 'toledo-continuo').peso).toBe(12340)
    })

    it('el byte C extiende la unidad a gramos y onzas', () => {
        expect(parseFrame(toledo('"', ' ', '!', '000500'), 'toledo-continuo').unidad).toBe('g')
        expect(parseFrame(toledo('"', ' ', '#', '000016'), 'toledo-continuo').unidad).toBe('oz')
    })

    it('tolera el checksum de la trama anterior antes del STX', () => {
        expect(parseFrame(`K${toledo('$', '0', ' ', '000000')}`, 'toledo-continuo')).toEqual({
            peso: 0,
            unidad: 'kg',
        })
    })

    it('una trama sin STX o con menos de 12 dígitos no es Toledo', () => {
        expect(parseFrame('$0 001234000000', 'toledo-continuo').peso).toBeNull()
        expect(parseFrame(`${STX}$0 0012`, 'toledo-continuo').peso).toBeNull()
    })
})

describe('parseFrame — basura', () => {
    const basura = ['��\u0013\u0011', '#@!&%', '', '\u0000\u0000\u0000']

    it.each(basura)('ningún formato lee peso en %j', (trama) => {
        expect(parseFrame(trama, 'texto').peso).toBeNull()
        expect(parseFrame(trama, 'invertido').peso).toBeNull()
        expect(parseFrame(trama, 'toledo-continuo').peso).toBeNull()
    })
})
