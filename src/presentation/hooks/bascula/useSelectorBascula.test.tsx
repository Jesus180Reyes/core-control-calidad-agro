// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectorBascula } from './useSelectorBascula'

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

    it('autorizar una báscula nueva pide el alias y lo persiste', async () => {
        instalarSerial([])
        const nueva = puertoA()
        serial.porAutorizar = nueva

        const { result } = montarHook()
        await abrirYEsperar(result, 0)

        act(() => { result.current.autorizarNueva() })

        await waitFor(() => {
            expect(result.current.pendienteDeAlias?.clave).toBe('0403:6001')
        })
        expect(serial.requestPort).toHaveBeenCalledTimes(1)
        expect(result.current.basculas).toHaveLength(1)

        await act(async () => { await result.current.confirmarAlias('Báscula Recepción') })

        expect(result.current.pendienteDeAlias).toBeNull()
        expect(JSON.parse(localStorage.getItem(CLAVE_ALIAS) ?? '{}')).toEqual({
            '0403:6001': 'Báscula Recepción',
        })
        await waitFor(() => {
            expect(result.current.basculas[0].alias).toBe('Báscula Recepción')
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

        const { result, onSeleccionar, unmount } = montarHook()
        await abrirYEsperar(result, 2)

        await act(async () => { await result.current.seleccionar('0403:6001') })

        expect(onSeleccionar).toHaveBeenCalledTimes(1)
        expect(onSeleccionar).toHaveBeenCalledWith(a.comoSerialPort())
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
