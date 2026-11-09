// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProbeResult, ScaleProfile } from '#/presentation/types/control-calidad/perfil-bascula.types'
import { DEFAULT_SCALE_PROFILE } from './scaleDetection'
import { useSelectorBascula } from './useSelectorBascula'

const deteccion = vi.hoisted(() => ({
    detect: vi.fn<(puerto: SerialPort) => Promise<ScaleProfile | null>>(),
    cancel: vi.fn(),
    probe: vi.fn<(puerto: SerialPort, input: unknown, signal: AbortSignal) => Promise<ProbeResult | null>>(),
}))

vi.mock('./useScaleDetection', () => ({
    useScaleDetection: () => ({
        detect: deteccion.detect,
        cancel: deteccion.cancel,
        waitIdle: async () => { },
        progress: 0.5,
        isDetecting: false,
        lastWeight: 12.34,
    }),
    probeScaleProfile: deteccion.probe,
}))

/**
 * Puerto serial simulado. El selector solo consulta `getInfo()`: la apertura y
 * la lectura de tramas las prueba `useSerialScale.test.tsx` con su `PuertoFalso`.
 */
class PuertoFalso {
    constructor(private readonly info: SerialPortInfo) { }

    getInfo = vi.fn((): SerialPortInfo => this.info)

    /** El hook compara puertos por identidad, así que basta con el cast. */
    comoSerialPort() {
        return this as unknown as SerialPort
    }
}

/** `navigator.serial` falso con una lista de puertos autorizados mutable. */
class SerialFalso extends EventTarget {
    onconnect = null
    ondisconnect = null
    requestPort: ReturnType<typeof vi.fn>
    getPorts: ReturnType<typeof vi.fn>

    /** Puerto que devuelve `requestPort()`; `null` simula la cancelación. */
    porAutorizar: PuertoFalso | null = null

    constructor(private autorizados: PuertoFalso[] = []) {
        super()
        this.getPorts = vi.fn(async () => this.autorizados.map((p) => p.comoSerialPort()))
        this.requestPort = vi.fn(async () => {
            if (!this.porAutorizar) {
                throw new DOMException('No port selected by the user.', 'NotFoundError')
            }
            // Igual que Chrome: el puerto elegido queda autorizado a partir de aquí.
            if (!this.autorizados.includes(this.porAutorizar)) {
                this.autorizados.push(this.porAutorizar)
            }
            return this.porAutorizar.comoSerialPort()
        })
    }
}

const CLAVE_ALIAS = 'bascula-alias:v1'
const CLAVE_PREFERIDA = 'bascula-preferida:v1'
const CLAVE_PERFIL = 'bascula-perfil:v1'

const perfilDetectado: ScaleProfile = {
    ...DEFAULT_SCALE_PROFILE,
    baudRate: 2400,
    byteFormat: '7E1',
    unit: 'lb',
    detectedAt: '2026-11-07T14:02:11.000Z',
}

const guardarPerfil = (clave: string, perfil: ScaleProfile) =>
    localStorage.setItem(CLAVE_PERFIL, JSON.stringify({ [clave]: perfil }))

const perfilesGuardados = () => JSON.parse(localStorage.getItem(CLAVE_PERFIL) ?? '{}')

const puertoA = () => new PuertoFalso({ usbVendorId: 0x0403, usbProductId: 0x6001 })
const puertoB = () => new PuertoFalso({ usbVendorId: 0x10c4, usbProductId: 0xea60 })

let serial: SerialFalso

const instalarSerial = (puertos: PuertoFalso[] = []) => {
    serial = new SerialFalso(puertos)
    Object.defineProperty(navigator, 'serial', { value: serial, configurable: true, writable: true })
    return serial
}

const montarHook = (onSeleccionar = vi.fn(async () => true)) => {
    const vista = renderHook(() => useSelectorBascula({ onSeleccionar }))
    return { ...vista, onSeleccionar }
}

/** Abre el dialog y espera a que termine la enumeración. */
const abrirYEsperar = async (
    result: { current: ReturnType<typeof useSelectorBascula> },
    puertosEsperados: number,
) => {
    act(() => { result.current.abrir() })
    await waitFor(() => {
        expect(result.current.cargando).toBe(false)
        expect(result.current.basculas).toHaveLength(puertosEsperados)
    })
}

beforeEach(() => {
    localStorage.clear()
    deteccion.detect.mockReset().mockResolvedValue(perfilDetectado)
    deteccion.cancel.mockReset()
    deteccion.probe.mockReset()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('useSelectorBascula', () => {

    it('sin básculas autorizadas deja la lista vacía y no abre el selector nativo', async () => {
        instalarSerial([])
        const { result } = montarHook()

        await waitFor(() => { expect(result.current.soportado).toBe(true) })
        await abrirYEsperar(result, 0)

        expect(result.current.abierto).toBe(true)
        expect(result.current.basculas).toEqual([])
        expect(result.current.pendienteDeAlias).toBeNull()
        expect(serial.requestPort).not.toHaveBeenCalled()
    })

    it('lista las básculas autorizadas con su clave USB y su alias guardado', async () => {
        const a = puertoA()
        const b = puertoB()
        instalarSerial([a, b])
        localStorage.setItem(CLAVE_ALIAS, JSON.stringify({ '0403:6001': 'Báscula Piso 1' }))

        const { result } = montarHook()
        await abrirYEsperar(result, 2)

        const [primera, segunda] = result.current.basculas
        expect(primera.clave).toBe('0403:6001')
        expect(primera.alias).toBe('Báscula Piso 1')
        expect(primera.usbVendorId).toBe(0x0403)
        expect(primera.puerto).toBe(a.comoSerialPort())
        expect(primera.esPreferida).toBe(false)

        // Sin alias guardado: el dialog la pinta con sus IDs USB.
        expect(segunda.clave).toBe('10c4:ea60')
        expect(segunda.alias).toBeNull()
        expect(segunda.puerto).toBe(b.comoSerialPort())
    })

    it('autorizar una báscula nueva pide el alias, lo persiste y pasa a detectarla', async () => {
        instalarSerial([])
        const nueva = puertoA()
        serial.porAutorizar = nueva
        deteccion.detect.mockReturnValue(new Promise(() => { }))

        const { result } = montarHook()
        await abrirYEsperar(result, 0)

        act(() => { result.current.autorizarNueva() })

        await waitFor(() => {
            expect(result.current.pendienteDeAlias?.clave).toBe('0403:6001')
        })
        expect(result.current.paso).toBe('alias')
        expect(serial.requestPort).toHaveBeenCalledTimes(1)
        expect(result.current.basculas).toHaveLength(1)

        await act(async () => { void result.current.confirmarAlias('Báscula Recepción') })

        await waitFor(() => { expect(result.current.paso).toBe('detectando') })
        expect(result.current.pendienteDeAlias).toBeNull()
        expect(result.current.enDeteccion?.alias).toBe('Báscula Recepción')
        expect(deteccion.detect).toHaveBeenCalledWith(nueva.comoSerialPort())
        expect(JSON.parse(localStorage.getItem(CLAVE_ALIAS) ?? '{}')).toEqual({
            '0403:6001': 'Báscula Recepción',
        })
    })

    it('cancelar el selector nativo deja el dialog abierto y sin cambios', async () => {
        instalarSerial([])
        const { result } = montarHook()
        await abrirYEsperar(result, 0)

        // `porAutorizar` en null: `requestPort()` rechaza con NotFoundError.
        act(() => { result.current.autorizarNueva() })
        await waitFor(() => { expect(serial.requestPort).toHaveBeenCalledTimes(1) })

        expect(result.current.abierto).toBe(true)
        expect(result.current.pendienteDeAlias).toBeNull()
        expect(result.current.basculas).toEqual([])
    })

    it('recuerda la báscula elegida y la reconoce en la siguiente sesión', async () => {
        const a = puertoA()
        const b = puertoB()
        instalarSerial([a, b])
        guardarPerfil('0403:6001', perfilDetectado)

        const { result, onSeleccionar, unmount } = montarHook()
        await abrirYEsperar(result, 2)

        await act(async () => { await result.current.seleccionar('0403:6001') })

        expect(deteccion.detect).not.toHaveBeenCalled()
        expect(onSeleccionar).toHaveBeenCalledTimes(1)
        expect(onSeleccionar).toHaveBeenCalledWith(a.comoSerialPort(), perfilDetectado)
        expect(result.current.abierto).toBe(false)
        expect(localStorage.getItem(CLAVE_PREFERIDA)).toBe('0403:6001')

        // Sesión nueva: el hook se vuelve a montar y la preferida sigue marcada.
        unmount()
        const segunda = montarHook()
        await abrirYEsperar(segunda.result, 2)

        expect(segunda.result.current.basculas[0].esPreferida).toBe(true)
        expect(segunda.result.current.basculas[1].esPreferida).toBe(false)

        const preferido = await segunda.result.current.resolverPuertoPreferido()
        expect(preferido).toBe(a.comoSerialPort())
    })

    it('resolverPuertoPreferido devuelve null cuando la báscula guardada no está', async () => {
        // Solo está enchufada la otra báscula.
        instalarSerial([puertoB()])
        localStorage.setItem(CLAVE_PREFERIDA, '0403:6001')

        const { result } = montarHook()
        await waitFor(() => { expect(result.current.soportado).toBe(true) })

        expect(await result.current.resolverPuertoPreferido()).toBeNull()
    })

    it('sin preferida guardada no resuelve ningún puerto', async () => {
        instalarSerial([puertoA()])

        const { result } = montarHook()
        await waitFor(() => { expect(result.current.soportado).toBe(true) })

        expect(await result.current.resolverPuertoPreferido()).toBeNull()
        expect(serial.getPorts).not.toHaveBeenCalled()
    })

    it('marca no soportado cuando el navegador no expone Web Serial', async () => {
        instalarSerial([])
        // @ts-expect-error se elimina la propiedad para simular Firefox/Safari
        delete navigator.serial

        const { result } = montarHook()
        await act(async () => { })

        expect(result.current.soportado).toBe(false)
        expect(await result.current.resolverPuertoPreferido()).toBeNull()

        act(() => { result.current.autorizarNueva() })
        expect(result.current.basculas).toEqual([])
    })
})

describe('useSelectorBascula con detección', () => {

    it('elegir una báscula sin perfil pasa a detectando, sin conectar', async () => {
        const a = puertoA()
        instalarSerial([a])
        deteccion.detect.mockReturnValue(new Promise(() => { }))

        const { result, onSeleccionar } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { void result.current.seleccionar('0403:6001') })

        expect(result.current.paso).toBe('detectando')
        expect(result.current.abierto).toBe(true)
        expect(result.current.enDeteccion?.clave).toBe('0403:6001')
        expect(deteccion.detect).toHaveBeenCalledWith(a.comoSerialPort())
        expect(onSeleccionar).not.toHaveBeenCalled()
    })

    it('una detección exitosa muestra el resultado y Usar esta báscula guarda perfil y preferida y conecta', async () => {
        const a = puertoA()
        instalarSerial([a])

        const { result, onSeleccionar } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { await result.current.seleccionar('0403:6001') })

        expect(result.current.paso).toBe('resultado')
        expect(result.current.perfilDetectado).toEqual(perfilDetectado)
        expect(result.current.lecturaDetectada).toBe(12.34)
        expect(perfilesGuardados()).toEqual({})

        await act(async () => { await result.current.usarResultado() })

        expect(perfilesGuardados()).toEqual({ '0403:6001': perfilDetectado })
        expect(localStorage.getItem(CLAVE_PREFERIDA)).toBe('0403:6001')
        expect(onSeleccionar).toHaveBeenCalledWith(a.comoSerialPort(), perfilDetectado)
        expect(result.current.abierto).toBe(false)
        expect(result.current.paso).toBe('lista')
    })

    it('una detección fallida muestra el fallo y Reintentar vuelve a detectar', async () => {
        instalarSerial([puertoA()])
        deteccion.detect.mockResolvedValueOnce(null)

        const { result, onSeleccionar } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { await result.current.seleccionar('0403:6001') })
        expect(result.current.paso).toBe('fallo')
        expect(result.current.perfilDetectado).toBeNull()

        await act(async () => { await result.current.reintentar() })

        expect(deteccion.detect).toHaveBeenCalledTimes(2)
        expect(result.current.paso).toBe('resultado')
        expect(onSeleccionar).not.toHaveBeenCalled()
    })

    it('Cancelar vuelve a la lista, corta la detección y no guarda nada aunque llegue el resultado', async () => {
        instalarSerial([puertoA()])
        let resolver: (perfil: ScaleProfile | null) => void = () => { }
        deteccion.detect.mockReturnValue(new Promise((resolve) => { resolver = resolve }))

        const { result, onSeleccionar } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { void result.current.seleccionar('0403:6001') })
        expect(result.current.paso).toBe('detectando')

        act(() => { result.current.cancelarDeteccion() })
        expect(deteccion.cancel).toHaveBeenCalled()
        expect(result.current.paso).toBe('lista')
        expect(result.current.enDeteccion).toBeNull()

        await act(async () => { resolver(perfilDetectado) })

        expect(result.current.paso).toBe('lista')
        expect(perfilesGuardados()).toEqual({})
        expect(onSeleccionar).not.toHaveBeenCalled()
    })

    it('cerrar el dialog durante la detección equivale a Cancelar', async () => {
        instalarSerial([puertoA()])
        deteccion.detect.mockReturnValue(new Promise(() => { }))

        const { result } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { void result.current.seleccionar('0403:6001') })
        act(() => { result.current.cerrar() })

        expect(deteccion.cancel).toHaveBeenCalled()
        expect(result.current.abierto).toBe(false)
        expect(result.current.paso).toBe('lista')
    })

    it('Volver a detectar corre la detección sobre una báscula con perfil y lo reemplaza', async () => {
        const a = puertoA()
        instalarSerial([a])
        guardarPerfil('0403:6001', DEFAULT_SCALE_PROFILE)

        const { result } = montarHook()
        await abrirYEsperar(result, 1)

        await act(async () => { await result.current.volverADetectar('0403:6001') })
        expect(deteccion.detect).toHaveBeenCalledWith(a.comoSerialPort())
        expect(result.current.paso).toBe('resultado')

        await act(async () => { await result.current.usarResultado() })
        expect(perfilesGuardados()).toEqual({ '0403:6001': perfilDetectado })
    })

    it('Volver a detectar funciona con el dialog cerrado y lo abre en detectando', async () => {
        instalarSerial([puertoA()])
        deteccion.detect.mockReturnValue(new Promise(() => { }))

        const { result } = montarHook()
        await waitFor(() => { expect(result.current.soportado).toBe(true) })

        await act(async () => { void result.current.volverADetectar('0403:6001') })

        await waitFor(() => { expect(result.current.paso).toBe('detectando') })
        expect(result.current.abierto).toBe(true)
    })

    it('mostrarFallo abre el dialog directo en el fallo, sin detectar', async () => {
        instalarSerial([puertoA()])

        const { result } = montarHook()
        await waitFor(() => { expect(result.current.soportado).toBe(true) })

        await act(async () => { await result.current.mostrarFallo('0403:6001') })

        expect(result.current.abierto).toBe(true)
        expect(result.current.paso).toBe('fallo')
        expect(result.current.enDeteccion?.clave).toBe('0403:6001')
        expect(deteccion.detect).not.toHaveBeenCalled()
    })

    it('Configurar a mano sólo guarda después de una prueba que leyó un peso', async () => {
        const a = puertoA()
        instalarSerial([a])
        deteccion.detect.mockResolvedValue(null)
        const input = {
            baudRate: 4800, byteFormat: '8N1', mode: 'consulta', pollCommand: 'w', frameFormat: 'texto',
        } as const

        const { result, onSeleccionar } = montarHook()
        await abrirYEsperar(result, 1)
        await act(async () => { await result.current.seleccionar('0403:6001') })

        act(() => { result.current.configurarAMano() })
        expect(result.current.paso).toBe('manual')
        expect(await result.current.guardarManual()).toBe(false)

        deteccion.probe.mockResolvedValueOnce({ lines: ['ERR'], peso: null, unidad: null, terminator: '\r' })
        await act(async () => { await result.current.probarManual(input) })
        expect(deteccion.probe).toHaveBeenCalledWith(a.comoSerialPort(), input, expect.any(AbortSignal))
        expect(result.current.pruebaManual?.result.lines).toEqual(['ERR'])

        let guardado = true
        await act(async () => { guardado = await result.current.guardarManual() })
        expect(guardado).toBe(false)
        expect(perfilesGuardados()).toEqual({})

        deteccion.probe.mockResolvedValueOnce({ lines: ['  12.00 kg'], peso: 12, unidad: 'kg', terminator: '\r' })
        await act(async () => { await result.current.probarManual(input) })
        await act(async () => { await result.current.guardarManual() })

        const guardadoManual = perfilesGuardados()['0403:6001']
        expect(guardadoManual).toMatchObject({
            ...input, terminator: '\r', unit: 'kg', source: 'manual', version: 1,
        })
        expect(onSeleccionar).toHaveBeenCalledWith(a.comoSerialPort(), guardadoManual)
    })

    it('Volver desde el formulario manual regresa al fallo', async () => {
        instalarSerial([puertoA()])
        deteccion.detect.mockResolvedValue(null)

        const { result } = montarHook()
        await abrirYEsperar(result, 1)
        await act(async () => { await result.current.seleccionar('0403:6001') })

        act(() => { result.current.configurarAMano() })
        act(() => { result.current.salirDelManual() })

        expect(result.current.paso).toBe('fallo')
    })

    it('resolverPerfilPreferido devuelve el perfil guardado o el de por defecto', async () => {
        instalarSerial([puertoA()])
        const { result } = montarHook()

        expect(result.current.resolverPerfilPreferido()).toEqual(DEFAULT_SCALE_PROFILE)

        localStorage.setItem(CLAVE_PREFERIDA, '0403:6001')
        expect(result.current.resolverPerfilPreferido()).toEqual(DEFAULT_SCALE_PROFILE)

        guardarPerfil('0403:6001', perfilDetectado)
        expect(result.current.resolverPerfilPreferido()).toEqual(perfilDetectado)
    })
})
