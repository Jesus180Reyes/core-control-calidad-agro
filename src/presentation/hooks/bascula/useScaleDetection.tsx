import { useCallback, useEffect, useRef, useState } from 'react'
import type {
    ByteFormat,
    PollCommandId,
    ScaleProfile,
} from '#/presentation/types/control-calidad/perfil-bascula.types'
import {
    DETECTION_BAUD_RATES,
    POLL_COMMANDS,
    UMBRAL_CONFIANZA,
    UMBRAL_MINIMO,
    readReply,
    scoreSample,
    toSerialOptions,
} from './scaleDetection'
import type { ReplyReading, SampleScore } from './scaleDetection'

export const LISTEN_MS = 1200
export const POLL_REPLY_MS = 400
export const DETECTION_TIMEOUT_MS = 45_000

const ALTERNATE_BYTE_FORMATS: ByteFormat[] = ['7E1', '7O1']
const POLL_BAUD_RATES = [9600, 2400, 4800, 19200] as const
const POLL_BYTE_FORMATS: ByteFormat[] = ['8N1', '7E1']
const POLL_COMMAND_IDS = Object.keys(POLL_COMMANDS) as PollCommandId[]

const LISTEN_PHASE_SHARE = 0.4

export interface DetectionResult {
    profile: ScaleProfile
    lastWeight: number
}

interface DetectionOptions {
    signal: AbortSignal
    onProgress?: (progress: number) => void
}

interface SerialSession {
    takeBytes: () => Uint8Array
    hadErrors: () => boolean
    send: (command: string) => Promise<void>
    close: () => Promise<void>
}

const sleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
        if (signal.aborted) {
            resolve()
            return
        }
        const finish = () => {
            clearTimeout(timer)
            signal.removeEventListener('abort', finish)
            resolve()
        }
        const timer = setTimeout(finish, ms)
        signal.addEventListener('abort', finish, { once: true })
    })

const encodeCommand = (command: string): Uint8Array =>
    Uint8Array.from(command, (char) => char.charCodeAt(0) & 0xff)

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
    }
    return bytes
}

const openSession = async (port: SerialPort, options: SerialOptions): Promise<SerialSession> => {
    await port.open(options)

    let chunks: Uint8Array[] = []
    let errored = false
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null

    const loop = (async () => {
        const readable = port.readable
        if (!readable) return
        reader = readable.getReader()
        try {
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                if (value?.length) chunks.push(value)
            }
        } catch {
            errored = true
        } finally {
            try { reader.releaseLock() } catch { errored = true }
        }
    })()

    return {
        takeBytes: () => {
            const bytes = concatBytes(chunks)
            chunks = []
            return bytes
        },
        hadErrors: () => errored,
        send: async (command) => {
            const writable = port.writable
            if (!writable) return
            writer = writable.getWriter()
            try {
                await writer.write(encodeCommand(command))
            } finally {
                writer.releaseLock()
                writer = null
            }
        },
        close: async () => {
            try { await reader?.cancel() } catch { errored = true }
            await loop
            try { writer?.releaseLock() } catch { errored = true }
            try { await port.close() } catch { errored = true }
        },
    }
}

interface ListenResult {
    bytes: Uint8Array
    received: boolean
}

const listen = async (
    port: SerialPort,
    baudRate: number,
    byteFormat: ByteFormat,
    signal: AbortSignal,
): Promise<ListenResult> => {
    let session: SerialSession
    try {
        session = await openSession(port, toSerialOptions({ baudRate, byteFormat }))
    } catch {
        return { bytes: new Uint8Array(), received: false }
    }
    try {
        await sleep(LISTEN_MS, signal)
        const bytes = session.takeBytes()
        return { bytes, received: bytes.length > 0 || session.hadErrors() }
    } finally {
        await session.close()
    }
}

const askTwice = async (
    session: SerialSession,
    command: string,
    byteFormat: ByteFormat,
    signal: AbortSignal,
): Promise<ReplyReading | null> => {
    let previous: ReplyReading | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
        session.takeBytes()
        await session.send(command)
        await sleep(POLL_REPLY_MS, signal)
        if (signal.aborted) return null

        const reply = readReply(session.takeBytes(), byteFormat)
        if (!reply) return null
        if (previous && (previous.frameFormat !== reply.frameFormat || previous.terminator !== reply.terminator)) {
            return null
        }
        previous = reply
    }
    return previous
}

const buildProfile = (
    baudRate: number,
    byteFormat: ByteFormat,
    reading: Pick<SampleScore, 'frameFormat' | 'terminator' | 'unit'>,
    pollCommand: PollCommandId | null,
): ScaleProfile => ({
    version: 1,
    baudRate,
    byteFormat,
    mode: pollCommand ? 'consulta' : 'continuo',
    pollCommand,
    frameFormat: reading.frameFormat,
    terminator: reading.terminator,
    unit: reading.unit,
    source: 'auto',
    detectedAt: new Date().toISOString(),
})

interface Candidate {
    baudRate: number
    byteFormat: ByteFormat
    score: SampleScore
}

const runContinuousPhases = async (
    port: SerialPort,
    signal: AbortSignal,
    report: (progress: number) => void,
): Promise<{ result: DetectionResult | null; allSilent: boolean }> => {
    const candidates: Candidate[] = []
    const withBytes: { baudRate: number; bytes: Uint8Array }[] = []
    const toResult = ({ baudRate, byteFormat, score }: Candidate): DetectionResult => ({
        profile: buildProfile(baudRate, byteFormat, score, null),
        lastWeight: score.lastWeight,
    })

    for (const [index, baudRate] of DETECTION_BAUD_RATES.entries()) {
        if (signal.aborted) return { result: null, allSilent: false }
        const { bytes, received } = await listen(port, baudRate, '8N1', signal)
        report(((index + 1) / DETECTION_BAUD_RATES.length) * LISTEN_PHASE_SHARE)
        if (!received) continue

        withBytes.push({ baudRate, bytes })
        const score = scoreSample(bytes, '8N1')
        if (!score) continue
        const candidate = { baudRate, byteFormat: '8N1' as const, score }
        if (score.score > UMBRAL_CONFIANZA) return { result: toResult(candidate), allSilent: false }
        candidates.push(candidate)
    }

    if (withBytes.length === 0) return { result: null, allSilent: true }

    const steps = withBytes.length * ALTERNATE_BYTE_FORMATS.length
    let step = 0
    for (const { baudRate } of withBytes) {
        for (const byteFormat of ALTERNATE_BYTE_FORMATS) {
            if (signal.aborted) return { result: null, allSilent: false }
            const { bytes } = await listen(port, baudRate, byteFormat, signal)
            step++
            report(LISTEN_PHASE_SHARE + (step / steps) * (1 - LISTEN_PHASE_SHARE))

            const score = scoreSample(bytes, byteFormat)
            if (!score) continue
            const candidate = { baudRate, byteFormat, score }
            if (score.score > UMBRAL_CONFIANZA) return { result: toResult(candidate), allSilent: false }
            candidates.push(candidate)
        }
    }

    const best = candidates
        .filter((candidate) => candidate.score.score > UMBRAL_MINIMO)
        .reduce<Candidate | null>((top, candidate) => (!top || candidate.score.score > top.score.score ? candidate : top), null)

    return { result: best ? toResult(best) : null, allSilent: false }
}

const runPollPhase = async (
    port: SerialPort,
    signal: AbortSignal,
    report: (progress: number) => void,
): Promise<DetectionResult | null> => {
    const steps = POLL_BAUD_RATES.length * POLL_BYTE_FORMATS.length
    let step = 0

    for (const baudRate of POLL_BAUD_RATES) {
        for (const byteFormat of POLL_BYTE_FORMATS) {
            if (signal.aborted) return null

            let session: SerialSession | null = null
            try {
                session = await openSession(port, toSerialOptions({ baudRate, byteFormat }))
                for (const commandId of POLL_COMMAND_IDS) {
                    const reading = await askTwice(session, POLL_COMMANDS[commandId], byteFormat, signal)
                    if (signal.aborted) return null
                    if (reading) {
                        return {
                            profile: buildProfile(baudRate, byteFormat, reading, commandId),
                            lastWeight: reading.peso,
                        }
                    }
                }
            } catch {
                continue
            } finally {
                await session?.close()
                step++
                report(LISTEN_PHASE_SHARE + (step / steps) * (1 - LISTEN_PHASE_SHARE))
            }
        }
    }
    return null
}

export const detectScaleProfile = async (
    port: SerialPort,
    { signal, onProgress }: DetectionOptions,
): Promise<DetectionResult | null> => {
    const deadline = new AbortController()
    const timer = setTimeout(() => deadline.abort(), DETECTION_TIMEOUT_MS)
    const abortOnCancel = () => deadline.abort()
    signal.addEventListener('abort', abortOnCancel, { once: true })

    const report = (progress: number) => {
        if (!deadline.signal.aborted) onProgress?.(progress)
    }

    try {
        if (signal.aborted) return null
        const { result, allSilent } = await runContinuousPhases(port, deadline.signal, report)
        if (result) return deadline.signal.aborted ? null : result
        if (!allSilent) return null

        const polled = await runPollPhase(port, deadline.signal, report)
        return deadline.signal.aborted ? null : polled
    } finally {
        clearTimeout(timer)
        signal.removeEventListener('abort', abortOnCancel)
    }
}

export function useScaleDetection() {
    const [progress, setProgress] = useState(0)
    const [isDetecting, setIsDetecting] = useState(false)
    const [lastWeight, setLastWeight] = useState<number | null>(null)

    const controllerRef = useRef<AbortController | null>(null)
    const runningRef = useRef<Promise<unknown> | null>(null)
    const mountedRef = useRef(true)

    const cancel = useCallback(() => {
        controllerRef.current?.abort()
    }, [])

    const detect = useCallback(async (puerto: SerialPort): Promise<ScaleProfile | null> => {
        controllerRef.current?.abort()
        await runningRef.current

        const controller = new AbortController()
        controllerRef.current = controller
        const isCurrent = () => mountedRef.current && controllerRef.current === controller

        setProgress(0)
        setLastWeight(null)
        setIsDetecting(true)

        const running = detectScaleProfile(puerto, {
            signal: controller.signal,
            onProgress: (value) => { if (isCurrent()) setProgress(value) },
        }).catch(() => null)
        runningRef.current = running

        const result = await running
        if (runningRef.current === running) runningRef.current = null

        if (isCurrent()) {
            controllerRef.current = null
            setIsDetecting(false)
            setLastWeight(result?.lastWeight ?? null)
            if (result) setProgress(1)
        }
        return result?.profile ?? null
    }, [])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            controllerRef.current?.abort()
        }
    }, [])

    return { detect, cancel, progress, isDetecting, lastWeight }
}
