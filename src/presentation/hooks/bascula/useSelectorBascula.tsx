import { useCallback, useEffect, useRef, useState } from 'react'
import type {
    BasculaDisponible,
    ClaveBascula,
} from '#/presentation/types/control-calidad/selector-bascula.types'
import {
    claveDePuerto,
    guardarAlias,
    guardarPreferida,
    leerAlias,
    leerPreferida,
} from '#/presentation/hooks/bascula/almacenamientoBasculas'

export interface UseSelectorBasculaProps {
    /** Abre el puerto elegido. Devuelve `true` si la conexión se logró. */
    onSeleccionar: (puerto: SerialPort) => Promise<boolean>
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

    const montadoRef = useRef<boolean>(true)
    /** El callback se lee por ref para que `seleccionar` no cambie de identidad. */
    const onSeleccionarRef = useRef(onSeleccionar)

    useEffect(() => {
        onSeleccionarRef.current = onSeleccionar
    })

    useEffect(() => {
        montadoRef.current = true
        setSoportado(soportaWebSerial())
        return () => {
            montadoRef.current = false
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
        if (!montadoRef.current) return
        setBasculas(lista)
        setCargando(false)
    }, [listarBasculas])

    // La lista se enumera al abrir el dialog, nunca durante el render.
    useEffect(() => {
        if (!abierto) return
        void refrescar()
    }, [abierto, refrescar])

    const abrir = useCallback(() => {
        setPendienteDeAlias(null)
        setAbierto(true)
    }, [])

    const cerrar = useCallback(() => {
        setAbierto(false)
        setPendienteDeAlias(null)
    }, [])

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
                }
            })
            .catch(() => {
                // El operario cerró el selector nativo: el dialog se queda como estaba.
            })
    }, [listarBasculas])

    /** Guarda el alias de la báscula pendiente y vuelve a la lista. */
    const confirmarAlias = useCallback(async (alias: string) => {
        const pendiente = pendienteDeAlias
        if (!pendiente) return

        const limpio = alias.trim()
        if (limpio) guardarAlias(pendiente.clave, limpio)

        setPendienteDeAlias(null)
        await refrescar()
    }, [pendienteDeAlias, refrescar])

    /** Recuerda la báscula elegida, cierra el dialog y manda a conectar. */
    const seleccionar = useCallback(async (clave: ClaveBascula): Promise<boolean> => {
        const elegida = basculas.find((bascula) => bascula.clave === clave)
        if (!elegida) return false

        guardarPreferida(clave)
        setBasculas((prev) => prev.map((bascula) => ({
            ...bascula,
            esPreferida: bascula.clave === clave,
        })))
        setAbierto(false)
        setPendienteDeAlias(null)

        return onSeleccionarRef.current(elegida.puerto)
    }, [basculas])

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
    }
}

export type UseSelectorBasculaReturn = ReturnType<typeof useSelectorBascula>
