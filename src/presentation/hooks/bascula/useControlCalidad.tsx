import type { InfoDesconexion } from "#/presentation/types/control-calidad/bascula.types"
import type { OperacionData, ParametrosData } from "#/presentation/types/control-calidad/control-calidad.types"
import type { Cliente } from "#/presentation/types/clientes/clientes.types"
import type { Lote } from "#/presentation/types/lotes/lotes.types"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePesajes } from "#/presentation/hooks/pesajes/usePesajes"
import { useSerialScale } from "./useSerialScale"
import { useSelectorBascula } from "./useSelectorBascula"

export function useControlCalidad(cliente: Cliente | null, lote: Lote | null) {
    /**
     * La operación se deriva del cliente y del lote que llegan de
     * `/clientes` → `/lotes-clientes`; ya no es un estado propio inventado.
     *
     * `etapa` queda vacía a propósito: todavía no existe la pantalla que la
     * elija. La cadena vacía es lo que `DetallesOperacionCard` pinta como `—`.
     */
    const operacion = useMemo<OperacionData>(() => ({
        cliente: cliente?.nombre ?? '',
        etapa: '',
        lote: lote?.nombre_lote ?? '',
    }), [cliente?.nombre, lote?.nombre_lote])

    /** El rango lo define el lote; el API manda los pesos como texto decimal. */
    const parametros = useMemo<ParametrosData>(() => ({
        minimo: Number(lote?.peso_minimo) || 0,
        ideal: Number(lote?.peso_ideal) || 0,
        maximo: Number(lote?.peso_maximo) || 0,
        unidad: lote?.unidad_medida ?? '',
    }), [lote?.peso_minimo, lote?.peso_ideal, lote?.peso_maximo, lote?.unidad_medida])

    /**
     * El selector necesita abrir el puerto y la báscula necesita al selector
     * para saber a cuál reconectar. La conexión se pasa por ref para romper esa
     * dependencia circular, igual que hace `useSerialScale` con su reconexión.
     */
    const conectarPuertoRef = useRef<(puerto: SerialPort) => Promise<boolean>>(async () => false)

    const selector = useSelectorBascula({
        onSeleccionar: (puerto) => conectarPuertoRef.current(puerto),
    })

    const scale = useSerialScale({
        baudRate: 9600,
        umbralCero: 5,
        segundosEstabilizacion: 5,
        // Tolerancia de ruido durante la ventana de estabilización.
        toleranciaEstabilidad: 5,
        // Aviso si el indicador deja de transmitir con el puerto abierto.
        timeoutSinDatosMs: 4000,
        autoReconectar: true,
        // Ancla la reconexión automática a la báscula que eligió el operario.
        resolverPuertoAutorizado: selector.resolverPuertoPreferido,
        onDesconexion: (info: InfoDesconexion) => {
            console.warn(`⚠️ Báscula (${info.motivo}) a las ${info.hora}: ${info.mensaje}`)
        },
    })

    useEffect(() => {
        conectarPuertoRef.current = (puerto) => scale.connectSerial({ puerto })
    })

    /** Evita un segundo intento con el doble montaje de React en desarrollo. */
    const autoConexionIntentadaRef = useRef<boolean>(false)

    // Auto-conexión al montar: si la báscula recordada sigue presente se abre
    // sola, sin abrir ningún dialog. Si no está, el header se queda en
    // "Desconectada" con su botón.
    useEffect(() => {
        if (autoConexionIntentadaRef.current) return
        autoConexionIntentadaRef.current = true

        void (async () => {
            const puerto = await selector.resolverPuertoPreferido()
            if (!puerto) return
            await conectarPuertoRef.current(puerto)
        })()
    }, [selector.resolverPuertoPreferido])

    const diferencia = scale.pesoActual - parametros.ideal
    const esBajoRango = scale.pesoActual < parametros.minimo
    const esAltoRango = scale.pesoActual > parametros.maximo
    const requiereReajuste = scale.pesoActual > 0 && (esBajoRango || esAltoRango)

    const [mostrarBloqueo, setMostrarBloqueo] = useState<boolean>(false)

    /**
     * Un peso crítico ya autorizado con PIN no vuelve a bloquear mientras se
     * pide la tara: la lectura viva sigue llegando y reevaluaría el rango.
     */
    const [autorizado, setAutorizado] = useState<boolean>(false)

    /**
     * La autorización vive atada a una muestra concreta. Si la muestra se
     * invalida —el operario agregó o quitó producto y la báscula reestabiliza—
     * el PIN anterior ya no cubre el peso nuevo y hay que volver a pedirlo.
     */
    useEffect(() => {
        if (scale.pesoEstable === null) setAutorizado(false)
    }, [scale.pesoEstable])

    useEffect(() => {
        // Solo se bloquea con lecturas confiables: la báscula debe estar
        // transmitiendo y el peso ya estabilizado (evita disparos durante la carga).
        // Sin muestra confirmada no hay nada que autorizar ni que guardar.
        setMostrarBloqueo(
            !autorizado && esAltoRango && scale.hayFlujoDatos && !scale.isStabilizing && scale.pesoEstable !== null,
        )
    }, [autorizado, esAltoRango, scale.hayFlujoDatos, scale.isStabilizing, scale.pesoEstable])

    const pesajes = usePesajes(lote)

    /** El dialog de tara es la única puerta al `POST /pesajes`. */
    const [taraAbierta, setTaraAbierta] = useState<boolean>(false)

    const solicitarTara = () => {
        if (scale.pesoEstable === null) return
        setTaraAbierta(true)
    }

    /**
     * Guarda la muestra ya confirmada —no la lectura viva— y solo si el
     * servidor la aceptó prepara la siguiente. Si falla, el dialog se queda
     * abierto con el peso en pantalla: el producto sigue sobre la plataforma y
     * se puede reintentar sin volver a pesar.
     */
    const confirmarTara = async (tara: number): Promise<void> => {
        if (scale.pesoEstable === null) return

        const guardado = await pesajes.guardarPesaje(scale.pesoEstable, tara)
        if (!guardado) return

        scale.reiniciarPesaje()
        setTaraAbierta(false)
        setAutorizado(false)
    }

    const cancelarTara = () => {
        if (pesajes.guardando) return

        setTaraAbierta(false)
        // Cancelar la tara de un peso crítico devuelve el bloqueo: el pesaje
        // sigue fuera de rango y no puede quedar sin autorizar.
        setAutorizado(false)
    }

    const handleRechazarPesaje = () => {
        console.log("❌ Pesaje rechazado por el operario")
        setMostrarBloqueo(false)
        scale.reiniciarPesaje()
    }

    /** El PIN sólo autoriza; el guardado ocurre al confirmar la tara. */
    const handleAutorizarConPin = (pinIngresado: string): boolean => {
        const pinCorrecto = "1234"
        if (pinIngresado !== pinCorrecto) return false

        setAutorizado(true)
        setTaraAbierta(true)

        return true
    }

    return {
        operacion,
        parametros,
        scale,
        selector,
        pesajeInfo: {
            diferencia,
            requiereReajuste,
        },
        guardando: pesajes.guardando,
        tara: {
            abierta: taraAbierta,
            /** `null` mientras la báscula reestabiliza: no hay muestra que guardar. */
            pesoBruto: scale.pesoEstable,
            reestabilizando: scale.pesoEstable === null,
            tiempoRestante: scale.tiempoRestante,
            solicitar: solicitarTara,
            cancelar: cancelarTara,
            confirmar: confirmarTara,
        },
        bloqueo: {
            mostrar: mostrarBloqueo,
            handleRechazar: handleRechazarPesaje,
            handleAutorizar: handleAutorizarConPin,
        }
    }
}
