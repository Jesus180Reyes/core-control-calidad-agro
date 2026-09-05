// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSerialScale } from './useSerialScale'

/** Puerto serial simulado: permite inyectar tramas y forzar la pérdida del dispositivo. */
class PuertoFalso {
    abierto = false
    connected = true
    readable: ReadableStream<Uint8Array> | null = null
    writable: WritableStream<Uint8Array> | null = null
    aperturas = 0

    private controlador: ReadableStreamDefaultController<Uint8Array> | null = null

    open = vi.fn(async () => {
        this.abierto = true
        this.aperturas += 1
        this.readable = new ReadableStream<Uint8Array>({
            start: (controlador) => { this.controlador = controlador },
            cancel: () => { this.controlador = null },
        })
    })

    close = vi.fn(async () => {
        this.abierto = false
        this.readable = null
    })

    forget = vi.fn(async () => { })
    getInfo = vi.fn(() => ({ usbVendorId: 0x1a86, usbProductId: 0x7523 }))
    getSignals = vi.fn(async () => ({
        dataCarrierDetect: false, clearToSend: false, ringIndicator: false, dataSetReady: false,
    }))
    setSignals = vi.fn(async () => { })
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    dispatchEvent = vi.fn(() => true)

    emitir(texto: string) {
        this.controlador?.enqueue(new TextEncoder().encode(texto))
    }

    perderDispositivo() {
        this.controlador?.error(new DOMException('The device has been lost.', 'NetworkError'))
        this.controlador = null
    }
}

class SerialFalso extends EventTarget {
    onconnect = null
    ondisconnect = null
    requestPort: ReturnType<typeof vi.fn>
    getPorts: ReturnType<typeof vi.fn>

    constructor(public puerto: PuertoFalso) {
        super()
        this.requestPort = vi.fn(async () => puerto as unknown as SerialPort)
        this.getPorts = vi.fn(async () => [puerto as unknown as SerialPort])
    }
}

let puerto: PuertoFalso
let serial: SerialFalso

const montarHook = (props: Parameters<typeof useSerialScale>[0] = {}) =>
    renderHook(() => useSerialScale({
        segundosEstabilizacion: 5,
        toleranciaEstabilidad: 2,
        umbralCero: 5,
        timeoutSinDatosMs: 4000,
        ...props,
    }))

const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

const emitir = async (texto: string, ms = 100) => {
    await act(async () => {
        puerto.emitir(texto)
        await vi.advanceTimersByTimeAsync(ms)
    })
}

beforeEach(() => {
    vi.useFakeTimers()
    puerto = new PuertoFalso()
    serial = new SerialFalso(puerto)
    Object.defineProperty(navigator, 'serial', { value: serial, configurable: true, writable: true })
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('useSerialScale', () => {

    it('abre el puerto y no bloquea a quien llama a connectSerial', async () => {
        const { result } = montarHook()

        await act(async () => {
            const abierto = await result.current.connectSerial()
            expect(abierto).toBe(true)
        })

        expect(puerto.abierto).toBe(true)
        expect(result.current.estado).toBe('conectada')
        expect(result.current.isConnected).toBe(true)
    })

    it('normaliza el cero y confirma la muestra cuando el peso se mantiene estable', async () => {
        const onPesajeEstable = vi.fn()
        const { result } = montarHook({ onPesajeEstable })

        await act(async () => { await result.current.connectSerial() })

        await emitir('  2.10\r\n')
        // Dentro del umbral de cero: se reporta 0 y no arranca la estabilización.
        expect(result.current.pesoActual).toBe(0)
        expect(result.current.isStabilizing).toBe(false)

        await emitir('ST,GS,+00230.10kg\r\n')
        expect(result.current.pesoActual).toBe(230.1)
        expect(result.current.isStabilizing).toBe(true)

        await avanzar(5000)
        expect(onPesajeEstable).toHaveBeenCalledTimes(1)
        expect(onPesajeEstable).toHaveBeenCalledWith(230.1)
        expect(result.current.isStabilizing).toBe(false)
        expect(result.current.pesoEstable).toBe(230.1)
    })

    it('reinicia la cuenta regresiva si el peso se sale de la tolerancia', async () => {
        const onPesajeEstable = vi.fn()
        const { result } = montarHook({ onPesajeEstable })

        await act(async () => { await result.current.connectSerial() })

        await emitir('230,00\r\n')
        await avanzar(3000)
        expect(result.current.tiempoRestante).toBeLessThan(5)

        // Salto de 10 g: la ventana debe empezar de nuevo.
        await emitir('240,00\r\n')
        expect(result.current.tiempoRestante).toBe(5)

        await avanzar(3000)
        expect(onPesajeEstable).not.toHaveBeenCalled()

        await avanzar(2100)
        expect(onPesajeEstable).toHaveBeenCalledWith(240)
    })

    it('invalida la muestra y reestabiliza si el peso cambia después de confirmarla', async () => {
        const onPesajeEstable = vi.fn()
        const { result } = montarHook({ onPesajeEstable })

        await act(async () => { await result.current.connectSerial() })

        await emitir('57,34\r\n')
        await avanzar(5100)
        expect(result.current.pesoEstable).toBe(57.34)

        // Ruido dentro de la tolerancia sobre la muestra ya confirmada: no toca nada.
        await emitir('59,00\r\n')
        expect(result.current.pesoEstable).toBe(57.34)
        expect(result.current.isStabilizing).toBe(false)

        // Se agrega producto: la muestra vieja ya no sirve.
        await emitir('119,02\r\n')
        expect(result.current.pesoEstable).toBeNull()
        expect(result.current.isStabilizing).toBe(true)
        expect(result.current.tiempoRestante).toBe(5)

        await avanzar(5100)
        expect(result.current.pesoEstable).toBe(119.02)
        expect(onPesajeEstable).toHaveBeenLastCalledWith(119.02)
        expect(onPesajeEstable).toHaveBeenCalledTimes(2)
    })

    it('interpreta el signo negativo aunque venga separado del número', async () => {
        const { result } = montarHook({ umbralCero: 1 })

        await act(async () => { await result.current.connectSerial() })
        await emitir('- 12,50 g\r\n')

        expect(result.current.pesoActual).toBe(-12.5)
    })

    it('avisa cuando la báscula deja de transmitir con el puerto abierto', async () => {
        const onDesconexion = vi.fn()
        const { result } = montarHook({ onDesconexion, autoReconectar: false })

        await act(async () => { await result.current.connectSerial() })
        await emitir('0.00\r\n')

        await avanzar(4500)

        expect(result.current.estado).toBe('sin-senal')
        expect(result.current.sinSenal).toBe(true)
        expect(result.current.desconexion?.motivo).toBe('sin-senal')
        expect(result.current.desconexion?.recuperable).toBe(true)
        expect(onDesconexion).toHaveBeenCalledTimes(1)
        // El puerto sigue abierto: la báscula puede volver sola.
        expect(puerto.abierto).toBe(true)

        await emitir('0.00\r\n')
        expect(result.current.estado).toBe('conectada')
        expect(result.current.senalRestablecida).toBe(true)
        expect(result.current.desconexion).toBeNull()
    })

    it('el reintento manual reabre el puerto cuando la báscula quedó sin señal', async () => {
        const { result } = montarHook({ autoReconectar: false })

        await act(async () => { await result.current.connectSerial() })
        await emitir('0.00\r\n')

        await avanzar(4500)
        expect(result.current.estado).toBe('sin-senal')
        expect(puerto.aperturas).toBe(1)

        await act(async () => {
            await result.current.reconectar()
            await vi.advanceTimersByTimeAsync(200)
        })

        // No basta con dejar el puerto como estaba: hay que cerrarlo y reabrirlo.
        expect(puerto.aperturas).toBe(2)
        expect(puerto.abierto).toBe(true)
        expect(serial.requestPort).toHaveBeenCalledTimes(1) // no se vuelve a pedir permiso
        expect(result.current.estado).toBe('conectada')
        expect(result.current.desconexion).toBeNull()
    })

    it('el reintento manual no toca el puerto si la báscula sí está transmitiendo', async () => {
        const { result } = montarHook()

        await act(async () => { await result.current.connectSerial() })
        await emitir('0.00\r\n')

        await act(async () => { await result.current.reconectar() })

        expect(puerto.aperturas).toBe(1)
        expect(result.current.estado).toBe('conectada')
    })

    it('avisa y invalida el pesaje cuando se pierde el dispositivo', async () => {
        const onDesconexion = vi.fn()
        const { result } = montarHook({ onDesconexion, autoReconectar: false })

        await act(async () => { await result.current.connectSerial() })
        await emitir('230.00\r\n')
        expect(result.current.isStabilizing).toBe(true)

        await act(async () => {
            puerto.perderDispositivo()
            await vi.advanceTimersByTimeAsync(200)
        })

        expect(result.current.desconexion?.motivo).toBe('cable')
        expect(result.current.desconexion?.interrumpioPesaje).toBe(true)
        expect(result.current.desconexion?.pesoAlDesconectar).toBe(230)
        expect(result.current.isStabilizing).toBe(false)
        expect(result.current.pesoActual).toBe(0)
        expect(result.current.estado).toBe('desconectada')
        expect(result.current.isConnected).toBe(false)
        expect(onDesconexion).toHaveBeenCalledTimes(1)
    })

    it('avisa cuando el navegador reporta el evento disconnect del USB', async () => {
        const { result } = montarHook({ autoReconectar: false })

        await act(async () => { await result.current.connectSerial() })
        await emitir('230.00\r\n')

        await act(async () => {
            serial.dispatchEvent(new Event('disconnect'))
            await vi.advanceTimersByTimeAsync(200)
        })

        expect(result.current.desconexion?.motivo).toBe('cable')
        expect(result.current.estado).toBe('desconectada')
        expect(puerto.abierto).toBe(false)
    })

    it('reabre solo el puerto ya autorizado tras una desconexión inesperada', async () => {
        const { result } = montarHook({ autoReconectar: true, maxIntentosReconexion: 3 })

        await act(async () => { await result.current.connectSerial() })
        await emitir('0.00\r\n')

        await act(async () => {
            puerto.perderDispositivo()
            await vi.advanceTimersByTimeAsync(200)
        })
        expect(result.current.estado).toBe('reconectando')

        // Backoff del primer intento: 1 s.
        await avanzar(1500)

        expect(puerto.aperturas).toBe(2)
        expect(serial.requestPort).toHaveBeenCalledTimes(1) // no se vuelve a pedir permiso
        expect(result.current.estado).toBe('conectada')
        expect(result.current.desconexion).toBeNull()
        expect(result.current.senalRestablecida).toBe(true)
    })

    it('la desconexión manual no genera alertas ni reintentos', async () => {
        const onDesconexion = vi.fn()
        const { result } = montarHook({ onDesconexion })

        await act(async () => { await result.current.connectSerial() })
        await emitir('230.00\r\n')

        await act(async () => {
            await result.current.disconnectSerial()
            await vi.advanceTimersByTimeAsync(1000)
        })

        expect(result.current.estado).toBe('desconectada')
        expect(result.current.desconexion).toBeNull()
        expect(result.current.error).toBeNull()
        expect(result.current.pesoActual).toBe(0)
        expect(onDesconexion).not.toHaveBeenCalled()
        expect(puerto.abierto).toBe(false)
        expect(puerto.aperturas).toBe(1)
    })

    it('marca no-soportada cuando el navegador no expone Web Serial', async () => {
        // @ts-expect-error se elimina la propiedad para simular Firefox/Safari
        delete navigator.serial

        const { result } = montarHook()
        await avanzar(0)

        expect(result.current.isSupported).toBe(false)
        expect(result.current.estado).toBe('no-soportada')
        expect(result.current.error).toContain('Web Serial')
    })
})
