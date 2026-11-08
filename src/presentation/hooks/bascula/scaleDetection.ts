import type {
    ByteFormat,
    FrameFormat,
    FrameTerminator,
    PollCommandId,
    ScaleProfile,
    WeightUnit,
} from '#/presentation/types/control-calidad/perfil-bascula.types'
import { parseFrame, splitFrames } from './scaleFrameParser'

export const DETECTION_BAUD_RATES = [9600, 2400, 4800, 19200, 1200, 38400] as const
export const DETECTION_BYTE_FORMATS: ByteFormat[] = ['8N1', '7E1', '7O1']

export const POLL_COMMANDS: Record<PollCommandId, string> = {
    sics: 'SI\r\n',
    'toledo-p': 'P',
    w: 'W\r',
    enq: '\x05',
}

export const FRAME_TERMINATORS: FrameTerminator[] = ['\r\n', '\r', '\n', '\x03']
export const FRAME_FORMATS: FrameFormat[] = ['toledo-continuo', 'invertido', 'texto']

export const UMBRAL_CONFIANZA = 0.9
export const UMBRAL_MINIMO = 0.6
export const MIN_VALID_FRAMES = 3

export const DEFAULT_SCALE_PROFILE: ScaleProfile = {
    version: 1,
    baudRate: 9600,
    byteFormat: '8N1',
    mode: 'continuo',
    pollCommand: null,
    frameFormat: 'texto',
    terminator: '\r\n',
    unit: null,
    source: 'auto',
    detectedAt: new Date(0).toISOString(),
}

const BYTE_FORMAT_OPTIONS: Record<ByteFormat, Pick<SerialOptions, 'dataBits' | 'parity'>> = {
    '8N1': { dataBits: 8, parity: 'none' },
    '7E1': { dataBits: 7, parity: 'even' },
    '7O1': { dataBits: 7, parity: 'odd' },
}

export const toSerialOptions = (
    profile: Pick<ScaleProfile, 'baudRate' | 'byteFormat'>,
): SerialOptions => ({
    baudRate: profile.baudRate,
    ...BYTE_FORMAT_OPTIONS[profile.byteFormat],
    stopBits: 1,
    flowControl: 'none',
})

export const decodeBytes = (bytes: Uint8Array, byteFormat: ByteFormat): string => {
    const mask = byteFormat === '8N1' ? 0xff : 0x7f
    let text = ''
    for (const byte of bytes) text += String.fromCharCode(byte & mask)
    return text
}

export interface SampleScore {
    score: number
    frameFormat: FrameFormat
    terminator: FrameTerminator
    unit: WeightUnit | null
    lastWeight: number
}

const ACCEPTED_CONTROL = new Set([0x02, 0x03, 0x09, 0x0a, 0x0d])

const isPrintable = (code: number): boolean =>
    (code >= 0x20 && code <= 0x7e) || ACCEPTED_CONTROL.has(code)

const printableRatio = (text: string): number => {
    let printable = 0
    for (let i = 0; i < text.length; i++) {
        if (isPrintable(text.charCodeAt(i))) printable++
    }
    return printable / text.length
}

const pickTerminator = (text: string): { terminator: FrameTerminator; frames: string[] } =>
    FRAME_TERMINATORS
        .map((terminator) => ({ terminator, frames: splitFrames(text, terminator).frames }))
        .reduce((best, candidate) => (candidate.frames.length > best.frames.length ? candidate : best))

interface ClassifiedFrame {
    frameFormat: FrameFormat | null
    peso: number | null
    unidad: WeightUnit | null
}

const classifyFrame = (frame: string): ClassifiedFrame => {
    for (const frameFormat of FRAME_FORMATS) {
        const { peso, unidad } = parseFrame(frame, frameFormat)
        if (peso !== null) return { frameFormat, peso, unidad }
    }
    return { frameFormat: null, peso: null, unidad: null }
}

const majorityUnit = (frames: ClassifiedFrame[]): WeightUnit | null => {
    const counts = new Map<WeightUnit, number>()
    for (const { unidad } of frames) {
        if (unidad) counts.set(unidad, (counts.get(unidad) ?? 0) + 1)
    }
    for (const [unit, count] of counts) {
        if (count > frames.length / 2) return unit
    }
    return null
}

const winningFormat = (frames: ClassifiedFrame[]): FrameFormat | null => {
    let best: FrameFormat | null = null
    let bestCount = 0
    for (const frameFormat of FRAME_FORMATS) {
        const count = frames.filter((frame) => frame.frameFormat === frameFormat).length
        if (count > bestCount) {
            best = frameFormat
            bestCount = count
        }
    }
    return best
}

export const scoreSample = (bytes: Uint8Array, byteFormat: ByteFormat): SampleScore | null => {
    if (bytes.length === 0) return null

    const text = decodeBytes(bytes, byteFormat)
    const { terminator, frames } = pickTerminator(text)
    const classified = frames.map(classifyFrame)
    const considered = classified[0]?.frameFormat === null ? classified.slice(1) : classified

    const frameFormat = winningFormat(considered)
    if (!frameFormat) return null

    const valid = considered.filter((frame) => frame.frameFormat === frameFormat)
    if (valid.length < MIN_VALID_FRAMES) return null

    return {
        score: (valid.length / considered.length) * printableRatio(text),
        frameFormat,
        terminator,
        unit: majorityUnit(valid),
        lastWeight: valid[valid.length - 1].peso as number,
    }
}
