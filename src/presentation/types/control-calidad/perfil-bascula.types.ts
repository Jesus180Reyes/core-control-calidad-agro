export type ByteFormat = '8N1' | '7E1' | '7O1'
export type FrameFormat = 'texto' | 'invertido' | 'toledo-continuo'
export type FrameTerminator = '\r\n' | '\r' | '\n' | '\x03'
export type WeightUnit = 'kg' | 'lb' | 'g' | 'oz'
export type PollCommandId = 'sics' | 'toledo-p' | 'w' | 'enq'
export type ScaleMode = 'continuo' | 'consulta'
export type ScaleProfileSource = 'auto' | 'manual'

export interface ScaleProfile {
    version: 1
    baudRate: number
    byteFormat: ByteFormat
    mode: ScaleMode
    pollCommand: PollCommandId | null
    frameFormat: FrameFormat
    terminator: FrameTerminator
    unit: WeightUnit | null
    source: ScaleProfileSource
    detectedAt: string
}

export type ManualProfileInput = Pick<ScaleProfile, 'baudRate' | 'byteFormat' | 'mode' | 'pollCommand' | 'frameFormat'>

export interface ProbeResult {
    lines: string[]
    peso: number | null
    unidad: WeightUnit | null
    terminator: FrameTerminator
}
