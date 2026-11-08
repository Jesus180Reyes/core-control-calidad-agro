// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ByteFormat } from '#/presentation/types/control-calidad/perfil-bascula.types'
import { DETECTION_TIMEOUT_MS, useScaleDetection } from './useScaleDetection'

interface ConfigBascula {
    baudRate: number
    byteFormat: ByteFormat
    trama: string
    comando?: string
}

const FORMATOS: Record<ByteFormat, { dataBits: number; parity: SerialParityType }> = {
    '8N1': { dataBits: 8, parity: 'none' },
    '7E1': { dataBits: 7, parity: 'even' },
    '7O1': { dataBits: 7, parity: 'odd' },
}

const conParidadPar = (byte: number) => {
    let unos = 0
    for (let bit = 0; bit < 7; bit++) unos += (byte >> bit) & 1
    return unos % 2 === 0 ? byte : byte | 0x80
}

class PuertoDetectable {
    abierto = false
    readable: ReadableStream<Uint8Array> | null = null
    writable: WritableStream<Uint8Array> | null = null
    aperturas: SerialOptions[] = []
    comandosRecibidos: string[] = []

    private controlador: ReadableStreamDefaultController<Uint8Array> | null = null
    private intervalo: ReturnType<typeof setInterval> | null = null
    private opciones: SerialOptions | null = null

    constructor(private readonly config: ConfigBascula | null) { }

    open = vi.fn(async (opciones: SerialOptions) => {
        if (this.abierto) throw new DOMException('The port is already open.', 'InvalidStateError')
        this.abierto = true
        this.opciones = opciones
        this.aperturas.push(opciones)
        this.readable = new ReadableStream<Uint8Array>({
            start: (controlador) => { this.controlador = controlador },
            cancel: () => { this.controlador = null },
        })
        this.writable = new WritableStream<Uint8Array>({
            write: (chunk) => this.recibirComando(String.fromCharCode(...chunk)),
        })
        if (this.config && !this.config.comando) {
            this.intervalo = setInterval(() => this.transmitir(), 100)
        }
    })

    close = vi.fn(async () => {
        if (this.readable?.locked || this.writable?.locked) {
            throw new TypeError('Failed to execute close on SerialPort: port is already locked.')
        }
        if (this.intervalo) clearInterval(this.intervalo)
        this.intervalo = null
        this.abierto = false
        this.readable = null
        this.writable = null
        this.controlador = null
    })

    getInfo = vi.fn(() => ({ usbVendorId: 0x0403, usbProductId: 0x6001 }))

    private hablaALaVelocidad() {
        return this.config !== null && this.opciones?.baudRate === this.config.baudRate
    }

    private transmitir() {
        if (!this.hablaALaVelocidad() || !this.config || !this.opciones) return
        const formato = FORMATOS[this.config.byteFormat]
        const abierto = this.opciones
        const coincide = abierto.dataBits === formato.dataBits && abierto.parity === formato.parity

        const bytes = Uint8Array.from(this.config.trama, (c) => c.charCodeAt(0))
        if (coincide) {
            this.controlador?.enqueue(bytes)
            return
        }
        if (abierto.dataBits === 8 && this.config.byteFormat === '7E1') {
            this.controlador?.enqueue(bytes.map(conParidadPar))
        }
    }

    private recibirComando(comando: string) {
        this.comandosRecibidos.push(comando)
        if (!this.config?.comando || comando !== this.config.comando) return
        const formato = FORMATOS[this.config.byteFormat]
        if (!this.hablaALaVelocidad() || this.opciones?.dataBits !== formato.dataBits || this.opciones?.parity !== formato.parity) {
            return
        }
        setTimeout(() => this.controlador?.enqueue(
            Uint8Array.from(this.config!.trama, (c) => c.charCodeAt(0)),
        ), 50)
    }
}

const montar = () => renderHook(() => useScaleDetection())

const correrDeteccion = async (
    detect: (puerto: SerialPort) => Promise<unknown>,
    puerto: PuertoDetectable,
    ms = DETECTION_TIMEOUT_MS + 1000,
) => {
    let resultado: unknown
    await act(async () => {
        const promesa = detect(puerto as unknown as SerialPort).then((valor) => { resultado = valor })
        await vi.advanceTimersByTimeAsync(ms)
        await promesa
    })
    return resultado
}

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('useScaleDetection', () => {
    it('reconoce una báscula continua a 9600 8N1 en la primera escucha', async () => {
        const puerto = new PuertoDetectable({ baudRate: 9600, byteFormat: '8N1', trama: '  12.34 kg\r\n' })
        const { result } = montar()

        const perfil = await correrDeteccion(result.current.detect, puerto, 2000)

        expect(perfil).toMatchObject({
            version: 1, baudRate: 9600, byteFormat: '8N1', mode: 'continuo', pollCommand: null,
            frameFormat: 'texto', terminator: '\r\n', unit: 'kg', source: 'auto',
        })
        expect(puerto.aperturas).toHaveLength(1)
        expect(puerto.abierto).toBe(false)
        expect(result.current.progress).toBe(1)
        expect(result.current.lastWeight).toBe(12.34)
        expect(result.current.isDetecting).toBe(false)
    })

    it('reconoce una báscula continua a 2400 7E1', async () => {
        const puerto = new PuertoDetectable({ baudRate: 2400, byteFormat: '7E1', trama: 'ST,GS,+00105.20 lb\r\n' })
        const { result } = montar()

        const perfil = await correrDeteccion(result.current.detect, puerto)

        expect(perfil).toMatchObject({
            baudRate: 2400, byteFormat: '7E1', mode: 'continuo', frameFormat: 'texto', unit: 'lb',
        })
        expect(result.current.lastWeight).toBe(105.2)
        expect(puerto.comandosRecibidos).toEqual([])
        expect(puerto.abierto).toBe(false)
    })

    it('reconoce una báscula por demanda SICS a 9600 y queda en modo consulta', async () => {
        const puerto = new PuertoDetectable({
            baudRate: 9600, byteFormat: '8N1', trama: 'S S      0.00 g\r\n', comando: 'SI\r\n',
        })
        const { result } = montar()

        const perfil = await correrDeteccion(result.current.detect, puerto)

        expect(perfil).toMatchObject({
            baudRate: 9600, byteFormat: '8N1', mode: 'consulta', pollCommand: 'sics',
            frameFormat: 'texto', terminator: '\r\n', unit: 'g',
        })
        expect(puerto.comandosRecibidos.filter((c) => c === 'SI\r\n')).toHaveLength(2)
        expect(result.current.lastWeight).toBe(0)
        expect(puerto.abierto).toBe(false)
    })

    it('no manda comandos si la báscula transmite, aunque no la reconozca', async () => {
        const puerto = new PuertoDetectable({ baudRate: 9600, byteFormat: '8N1', trama: '#@!&%\r\n' })
        const { result } = montar()

        const perfil = await correrDeteccion(result.current.detect, puerto)

        expect(perfil).toBeNull()
        expect(puerto.comandosRecibidos).toEqual([])
    })

    it('una báscula muda en todo devuelve null antes del tope y deja el puerto cerrado', async () => {
        const puerto = new PuertoDetectable(null)
        const { result } = montar()

        const perfil = await correrDeteccion(result.current.detect, puerto, DETECTION_TIMEOUT_MS)

        expect(perfil).toBeNull()
        expect(puerto.abierto).toBe(false)
        expect(puerto.comandosRecibidos.length).toBeGreaterThan(0)
        expect(result.current.isDetecting).toBe(false)
        expect(result.current.lastWeight).toBeNull()
    })

    it('cancelar a mitad devuelve null, deja el puerto cerrado y permite volver a abrirlo', async () => {
        const puerto = new PuertoDetectable(null)
        const { result } = montar()

        let perfil: unknown = 'pendiente'
        let promesa: Promise<void> = Promise.resolve()
        await act(async () => {
            promesa = result.current.detect(puerto as unknown as SerialPort).then((valor) => { perfil = valor })
            await vi.advanceTimersByTimeAsync(3000)
        })

        expect(result.current.isDetecting).toBe(true)
        expect(result.current.progress).toBeGreaterThan(0)
        expect(perfil).toBe('pendiente')

        await act(async () => {
            result.current.cancel()
            await vi.advanceTimersByTimeAsync(100)
            await promesa
        })

        expect(perfil).toBeNull()
        expect(puerto.abierto).toBe(false)
        expect(result.current.isDetecting).toBe(false)

        await expect(puerto.open({ baudRate: 9600 })).resolves.toBeUndefined()
    })

    it('al desmontar cancela la detección y cierra el puerto', async () => {
        const puerto = new PuertoDetectable(null)
        const { result, unmount } = montar()

        let perfil: unknown = 'pendiente'
        await act(async () => {
            const promesa = result.current.detect(puerto as unknown as SerialPort).then((valor) => { perfil = valor })
            await vi.advanceTimersByTimeAsync(500)
            unmount()
            await vi.advanceTimersByTimeAsync(100)
            await promesa
        })

        expect(perfil).toBeNull()
        expect(puerto.abierto).toBe(false)
    })
})
