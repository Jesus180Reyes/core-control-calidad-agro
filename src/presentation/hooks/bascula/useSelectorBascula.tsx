import { useCallback, useEffect, useRef, useState } from 'react'
import type {
    BasculaDisponible,
    ClaveBascula,
    SelectorStep,
} from '#/presentation/types/control-calidad/selector-bascula.types'
import type {
    ManualProfileInput,
    ProbeResult,
    ScaleProfile,
} from '#/presentation/types/control-calidad/perfil-bascula.types'
import {
    claveDePuerto,
    guardarAlias,
    guardarPreferida,
    leerAlias,
    leerPreferida,
    readProfile,
    saveProfile,
} from '#/presentation/hooks/bascula/almacenamientoBasculas'
import { DEFAULT_SCALE_PROFILE } from './scaleDetection'
import { probeScaleProfile, useScaleDetection } from './useScaleDetection'

export interface UseSelectorBasculaProps {
    /** Abre el puerto elegido con su perfil. Devuelve `true` si la conexión se logró. */
    onSeleccionar: (puerto: SerialPort, perfil: ScaleProfile) => Promise<boolean>
}

export interface ManualProbe {
    input: ManualProfileInput
    result: ProbeResult
}

const soportaWebSerial = () =>
    typeof navigator !== 'undefined' && 'serial' in navigator

/**
 * Selector de básculas ya autorizadas por el navegador.
 *
 * `getPorts()` devuelve los puertos con permiso concedido en este navegador y
 * perfil, sin mostrar ninguna UI: esa es la lista que pinta el dialog propio.
 * `requestPort()` es la única API que concede permiso a un dispositivo nuevo y
 * siempre abre el selector nativo del navegador, así que queda detrás del botón
 * "Autorizar báscula nueva".
 *
 * La enumeración ocurre solo dentro de `useEffect`: en SSR no existe
 * `navigator.serial` y el primer render deja `soportado` en `false`.
 */
export function useSelectorBascula({ onSeleccionar }: UseSelectorBasculaProps) {
    const [soportado, setSoportado] = useState<boolean>(false)
    const [abierto, setAbierto] = useState<boolean>(false)
    const [basculas, setBasculas] = useState<BasculaDisponible[]>([])
    const [cargando, setCargando] = useState<boolean>(false)
    const [pendienteDeAlias, setPendienteDeAlias] = useState<BasculaDisponible | null>(null)
    const [paso, setPaso] = useState<SelectorStep>('lista')
    const [enDeteccion, setEnDeteccion] = useState<BasculaDisponible | null>(null)
    const [perfilDetectado, setPerfilDetectado] = useState<ScaleProfile | null>(null)
    const [probando, setProbando] = useState<boolean>(false)
    const [pruebaManual, setPruebaManual] = useState<ManualProbe | null>(null)

    const deteccion = useScaleDetection()
    const cancelarDeteccionEnCurso = deteccion.cancel
    const detectar = deteccion.detect
    const esperarDeteccion = deteccion.waitIdle

    const montadoRef = useRef<boolean>(true)
    /** El callback se lee por ref para que `seleccionar` no cambie de identidad. */
    const onSeleccionarRef = useRef(onSeleccionar)
    const turnoDeteccionRef = useRef<number>(0)
    const pruebaRef = useRef<AbortController | null>(null)
    const pruebaEnCursoRef = useRef<Promise<unknown> | null>(null)

    useEffect(() => {
        onSeleccionarRef.current = onSeleccionar
    })

    useEffect(() => {
        montadoRef.current = true
        setSoportado(soportaWebSerial())
        return () => {
            montadoRef.current = false
            pruebaRef.current?.abort()
        }
    }, [])

    /** Lee `getPorts()` y lo cruza con los alias y la preferida guardados. */
    const listarBasculas = useCallback(async (): Promise<BasculaDisponible[]> => {
        if (!soportaWebSerial()) return []

        try {
            const puertos = await navigator.serial.getPorts()
            const alias = leerAlias()
            const preferida = leerPreferida()

            return puertos.map((puerto, indice) => {
                const info = puerto.getInfo()
                const clave = claveDePuerto(info, indice)
                return {
                    clave,
                    alias: alias[clave] ?? null,
                    usbVendorId: info.usbVendorId,
                    usbProductId: info.usbProductId,
                    puerto,
                    esPreferida: clave === preferida,
                }
            })
        } catch {
            return []
        }
    }, [])

    const refrescar = useCallback(async () => {
        setCargando(true)
        const lista = await listarBasculas()
        if (!montadoRef.current) return lista
        setBasculas(lista)
        setCargando(false)
        return lista
    }, [listarBasculas])

    // La lista se enumera al abrir el dialog, nunca durante el render.
    useEffect(() => {
        if (!abierto) return
        void refrescar()
    }, [abierto, refrescar])

    const detenerTrabajo = useCallback(() => {
        turnoDeteccionRef.current += 1
        cancelarDeteccionEnCurso()
        pruebaRef.current?.abort()
        pruebaRef.current = null
        setProbando(false)
    }, [cancelarDeteccionEnCurso])

    const volverALista = useCallback(() => {
        detenerTrabajo()
        setPaso('lista')
        setEnDeteccion(null)
        setPerfilDetectado(null)
        setPruebaManual(null)
        setPendienteDeAlias(null)
    }, [detenerTrabajo])

    const abrir = useCallback(() => {
        volverALista()
        setAbierto(true)
    }, [volverALista])

    const cerrar = useCallback(() => {
        volverALista()
        setAbierto(false)
    }, [volverALista])

    const correrDeteccion = useCallback(async (bascula: BasculaDisponible) => {
        detenerTrabajo()
        const turno = turnoDeteccionRef.current
        setEnDeteccion(bascula)
        setPerfilDetectado(null)
        setPruebaManual(null)
        setPendienteDeAlias(null)
        setPaso('detectando')
        setAbierto(true)

        const perfil = await detectar(bascula.puerto)
        if (!montadoRef.current || turnoDeteccionRef.current !== turno) return

        setPerfilDetectado(perfil)
        setPaso(perfil ? 'resultado' : 'fallo')
    }, [detectar, detenerTrabajo])

    const buscarBascula = useCallback(async (clave: ClaveBascula): Promise<BasculaDisponible | null> => {
        const enLista = basculas.find((bascula) => bascula.clave === clave)
        if (enLista) return enLista
        const lista = await listarBasculas()
        return lista.find((bascula) => bascula.clave === clave) ?? null
    }, [basculas, listarBasculas])

    /**
     * Dispara el selector nativo del navegador. `requestPort()` se invoca de
     * forma directa, sin `await` ni trabajo asíncrono antes, porque Chrome lo
     * rechaza si se pierde el gesto de usuario del click.
     */
    const autorizarNueva = useCallback(() => {
        if (!soportaWebSerial()) return

        navigator.serial.requestPort()
            .then(async (puertoNuevo) => {
                // Se vuelve a enumerar para obtener la clave del puerto recién
                // autorizado con el mismo criterio que el resto de la lista
                // (los puertos sin IDs USB dependen de su índice en `getPorts()`).
                const lista = await listarBasculas()
                if (!montadoRef.current) return

                setBasculas(lista)
                const registrada = lista.find((bascula) => bascula.puerto === puertoNuevo)
                // Sin alias todavía: se pide una vez. Si la clave ya tenía uno
                // guardado (permiso revocado y vuelto a conceder), se reutiliza.
                if (registrada && registrada.alias === null) {
                    setPendienteDeAlias(registrada)
                    setPaso('alias')
                }
            })
            .catch(() => {
                // El operario cerró el selector nativo: el dialog se queda como estaba.
            })
    }, [listarBasculas])

    /** Guarda el alias de la báscula pendiente y pasa a detectarla. */
    const confirmarAlias = useCallback(async (alias: string) => {
        const pendiente = pendienteDeAlias
        if (!pendiente) return

        const limpio = alias.trim()
        if (limpio) guardarAlias(pendiente.clave, limpio)

        setPendienteDeAlias(null)
        const lista = await refrescar()
        if (!montadoRef.current) return

        const actualizada = lista.find((bascula) => bascula.clave === pendiente.clave) ?? pendiente
        await correrDeteccion(actualizada)
    }, [correrDeteccion, pendienteDeAlias, refrescar])

    const conectarCon = useCallback(async (bascula: BasculaDisponible, perfil: ScaleProfile): Promise<boolean> => {
        guardarPreferida(bascula.clave)
        setBasculas((prev) => prev.map((item) => ({
            ...item,
            esPreferida: item.clave === bascula.clave,
        })))
        setAbierto(false)
        volverALista()

        await Promise.all([esperarDeteccion(), pruebaEnCursoRef.current])
        return onSeleccionarRef.current(bascula.puerto, perfil)
    }, [esperarDeteccion, volverALista])

    const seleccionar = useCallback(async (clave: ClaveBascula): Promise<boolean> => {
        const elegida = basculas.find((bascula) => bascula.clave === clave)
        if (!elegida) return false

        const perfil = readProfile(clave)
        if (perfil) return conectarCon(elegida, perfil)

        await correrDeteccion(elegida)
        return false
    }, [basculas, conectarCon, correrDeteccion])

    const volverADetectar = useCallback(async (clave: ClaveBascula): Promise<void> => {
        const bascula = await buscarBascula(clave)
        if (!bascula || !montadoRef.current) return
        await correrDeteccion(bascula)
    }, [buscarBascula, correrDeteccion])

    const mostrarFallo = useCallback(async (clave: ClaveBascula): Promise<void> => {
        const bascula = await buscarBascula(clave)
        if (!bascula || !montadoRef.current) return
        detenerTrabajo()
        setEnDeteccion(bascula)
        setPerfilDetectado(null)
        setPruebaManual(null)
        setPendienteDeAlias(null)
        setPaso('fallo')
        setAbierto(true)
    }, [buscarBascula, detenerTrabajo])

    const usarResultado = useCallback(async (): Promise<boolean> => {
        if (!enDeteccion || !perfilDetectado) return false
        saveProfile(enDeteccion.clave, perfilDetectado)
        return conectarCon(enDeteccion, perfilDetectado)
    }, [conectarCon, enDeteccion, perfilDetectado])

    const reintentar = useCallback(async (): Promise<void> => {
        if (!enDeteccion) return
        await correrDeteccion(enDeteccion)
    }, [correrDeteccion, enDeteccion])

    const configurarAMano = useCallback(() => {
        if (!enDeteccion) return
        setPruebaManual(null)
        setPaso('manual')
    }, [enDeteccion])

    const salirDelManual = useCallback(() => {
        pruebaRef.current?.abort()
        pruebaRef.current = null
        setProbando(false)
        setPruebaManual(null)
        setPaso('fallo')
    }, [])

    const descartarPrueba = useCallback(() => {
        setPruebaManual(null)
    }, [])

    const probarManual = useCallback(async (input: ManualProfileInput): Promise<ProbeResult | null> => {
        if (!enDeteccion) return null

        pruebaRef.current?.abort()
        await pruebaEnCursoRef.current
        const controller = new AbortController()
        pruebaRef.current = controller
        setProbando(true)
        setPruebaManual(null)

        const enCurso = probeScaleProfile(enDeteccion.puerto, input, controller.signal)
            .catch((): ProbeResult => ({ lines: [], peso: null, unidad: null, terminator: DEFAULT_SCALE_PROFILE.terminator }))
        pruebaEnCursoRef.current = enCurso
        const result = await enCurso
        if (pruebaEnCursoRef.current === enCurso) pruebaEnCursoRef.current = null

        if (!montadoRef.current || pruebaRef.current !== controller) return null
        pruebaRef.current = null
        setProbando(false)
        if (result) setPruebaManual({ input, result })
        return result
    }, [enDeteccion])

    const guardarManual = useCallback(async (): Promise<boolean> => {
        if (!enDeteccion || !pruebaManual || pruebaManual.result.peso === null) return false

        const { input, result } = pruebaManual
        const perfil: ScaleProfile = {
            version: 1,
            baudRate: input.baudRate,
            byteFormat: input.byteFormat,
            mode: input.mode,
            pollCommand: input.mode === 'consulta' ? input.pollCommand : null,
            frameFormat: input.frameFormat,
            terminator: result.terminator,
            unit: result.unidad,
            source: 'manual',
            detectedAt: new Date().toISOString(),
        }
        saveProfile(enDeteccion.clave, perfil)
        return conectarCon(enDeteccion, perfil)
    }, [conectarCon, enDeteccion, pruebaManual])

    /**
     * Puerto de la báscula guardada como preferida, o `null` si ya no está
     * autorizada o no está presente. Referencialmente estable: se pasa a
     * `useSerialScale` como `resolverPuertoAutorizado`.
     */
    const resolverPuertoPreferido = useCallback(async (): Promise<SerialPort | null> => {
        if (!soportaWebSerial()) return null

        const preferida = leerPreferida()
        if (!preferida) return null

        try {
            const puertos = await navigator.serial.getPorts()
            const encontrado = puertos.find(
                (puerto, indice) => claveDePuerto(puerto.getInfo(), indice) === preferida,
            )
            return encontrado ?? null
        } catch {
            return null
        }
    }, [])

    const resolverPerfilPreferido = useCallback((): ScaleProfile => {
        const preferida = leerPreferida()
        return (preferida ? readProfile(preferida) : null) ?? DEFAULT_SCALE_PROFILE
    }, [])

    return {
        soportado,
        abierto,
        abrir,
        cerrar,
        basculas,
        cargando,
        autorizarNueva,
        pendienteDeAlias,
        confirmarAlias,
        seleccionar,
        resolverPuertoPreferido,
        resolverPerfilPreferido,

        paso,
        enDeteccion,
        progresoDeteccion: deteccion.progress,
        perfilDetectado,
        lecturaDetectada: deteccion.lastWeight,
        volverADetectar,
        mostrarFallo,
        cancelarDeteccion: volverALista,
        usarResultado,
        reintentar,

        configurarAMano,
        salirDelManual,
        probarManual,
        descartarPrueba,
        probando,
        pruebaManual,
        guardarManual,
    }
}

export type UseSelectorBasculaReturn = ReturnType<typeof useSelectorBascula>
