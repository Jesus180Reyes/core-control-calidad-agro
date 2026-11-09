import type {
    FrameFormat,
    FrameTerminator,
    WeightUnit,
} from '#/presentation/types/control-calidad/perfil-bascula.types'

export interface ParsedFrame {
    peso: number | null
    unidad: WeightUnit | null
}

export interface SplitFramesResult {
    frames: string[]
    rest: string
}

const EMPTY_FRAME: ParsedFrame = { peso: null, unidad: null }

const RE_NUMBER = /([-+])?\s*(\d+(?:[.,]\d+)?|[.,]\d+)/
const RE_CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')
const RE_GROSS_NUMBER =
    /(?<![A-Za-z])(?:GROSS|Gross|gross|GS|G|B)(?![A-Za-z])\s*[:=,]?\s*([-+])?\s*(\d+(?:[.,]\d+)?|[.,]\d+)/
const RE_UNIT_AFTER_NUMBER = /^\s*(kg|lbs?|oz)(?![A-Za-z])/i
const RE_GRAMS_AFTER_NUMBER = /^\s*g(?![A-Za-z])/
const RE_UNIT_ANYWHERE = /(?<![A-Za-z])(kg|lbs?|oz)(?![A-Za-z])/i

const STX = '\x02'
const TOLEDO_FIELDS_LENGTH = 15
const RE_TOLEDO_DIGITS = /^\d{12}$/

export const splitFrames = (texto: string, terminador: FrameTerminator): SplitFramesResult => {
    const pieces = texto.split(terminador)
    const rest = pieces.pop() ?? ''
    return { frames: pieces.filter((piece) => piece.length > 0), rest }
}

const toUnit = (token: string): WeightUnit => {
    const lower = token.toLowerCase()
    if (lower === 'kg') return 'kg'
    if (lower === 'oz') return 'oz'
    return 'lb'
}

const unitAfter = (text: string, numberEnd: number): WeightUnit | null => {
    const tail = text.slice(numberEnd)
    const unit = tail.match(RE_UNIT_AFTER_NUMBER)
    if (unit) return toUnit(unit[1])
    if (RE_GRAMS_AFTER_NUMBER.test(tail)) return 'g'
    const anywhere = text.match(RE_UNIT_ANYWHERE)
    return anywhere ? toUnit(anywhere[1]) : null
}

const toNumber = (sign: string | undefined, digits: string): number | null => {
    const value = (sign === '-' ? -1 : 1) * Number.parseFloat(digits.replace(',', '.'))
    return Number.isFinite(value) ? value : null
}

const parseText = (frame: string): ParsedFrame => {
    const text = frame.replace(RE_CONTROL, ' ').replace(/\s+/g, ' ').trim()
    if (!text) return EMPTY_FRAME

    const gross = RE_GROSS_NUMBER.exec(text)
    const match = gross ?? RE_NUMBER.exec(text)
    if (!match) return EMPTY_FRAME

    const peso = toNumber(match[1], match[2])
    if (peso === null) return EMPTY_FRAME

    return { peso, unidad: unitAfter(text, match.index + match[0].length) }
}

const parseInverted = (frame: string): ParsedFrame => {
    const text = frame.replace(RE_CONTROL, '').trim()
    if (!text.startsWith('=')) return EMPTY_FRAME

    const body = text.slice(1).replace(/\s+/g, '')
    if (!/^\d*\.?\d*-?$/.test(body) || !/\d/.test(body)) return EMPTY_FRAME

    const reversed = body.split('').reverse().join('')
    const negative = reversed.startsWith('-')
    const value = Number.parseFloat(negative ? reversed.slice(1) : reversed)
    if (!Number.isFinite(value)) return EMPTY_FRAME

    return { peso: negative ? -value : value, unidad: null }
}

const toledoUnit = (statusB: number, statusC: number): WeightUnit | null => {
    const extended = statusC & 0x07
    if (extended === 0) return statusB & 0x10 ? 'kg' : 'lb'
    if (extended === 1) return 'g'
    if (extended === 3) return 'oz'
    return null
}

const toledoDecimals = (statusA: number): number => (statusA & 0x07) - 2

const parseToledo = (frame: string): ParsedFrame => {
    const start = frame.indexOf(STX)
    if (start === -1) return EMPTY_FRAME

    const fields = frame.slice(start + 1)
    if (fields.length < TOLEDO_FIELDS_LENGTH) return EMPTY_FRAME

    const statusA = fields.charCodeAt(0) & 0x7f
    const statusB = fields.charCodeAt(1) & 0x7f
    const statusC = fields.charCodeAt(2) & 0x7f
    if ((statusA & 0x60) !== 0x20 || (statusB & 0x20) !== 0x20) return EMPTY_FRAME

    const digits = fields.slice(3, TOLEDO_FIELDS_LENGTH)
    if (!RE_TOLEDO_DIGITS.test(digits)) return EMPTY_FRAME

    const raw = Number.parseInt(digits.slice(0, 6), 10)
    const decimals = toledoDecimals(statusA)
    const magnitude = decimals >= 0
        ? Number((raw / 10 ** decimals).toFixed(decimals))
        : raw * 10 ** -decimals
    const peso = statusB & 0x02 ? -magnitude : magnitude

    return { peso: peso === 0 ? 0 : peso, unidad: toledoUnit(statusB, statusC) }
}

const PARSERS: Record<FrameFormat, (frame: string) => ParsedFrame> = {
    texto: parseText,
    invertido: parseInverted,
    'toledo-continuo': parseToledo,
}

export const parseFrame = (trama: string, frameFormat: FrameFormat): ParsedFrame =>
    PARSERS[frameFormat](trama)
