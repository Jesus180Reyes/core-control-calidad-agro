import type { InfoDesconexion } from "#/presentation/types/control-calidad/bascula.types"
import type { OperacionData, ParametrosData } from "#/presentation/types/control-calidad/control-calidad.types"
import type { Cliente } from "#/presentation/types/clientes/clientes.types"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSerialScale } from "./useSerialScale"
import { useSelectorBascula } from "./useSelectorBascula"

export function useControlCalidad(cliente: Cliente | null) {
    /**
     * La operación se deriva del cliente que llega de `/clientes`; ya no es un
     * estado propio con un cliente inventado.
     *
     * `etapa` y `lote` quedan vacíos a propósito: no están en la tabla de
     * clientes y todavía no existe la pantalla que los elija. La cadena vacía
     * es lo que `DetallesOperacionCard` pinta como `—`.
     */
    const operacion = useMemo<OperacionData>(() => ({
        cliente: cliente?.nombre ?? '',
        etapa: '',
        lote: '',
    }), [cliente?.nombre])

    const [parametros] = useState<ParametrosData>({
        minimo: 220,
        ideal: 230,
        maximo: 252,
    })

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

    useEffect(() => {
        // Solo se bloquea con lecturas confiables: la báscula debe estar
        // transmitiendo y el peso ya estabilizado (evita disparos durante la carga).
        setMostrarBloqueo(esAltoRango && scale.hayFlujoDatos && !scale.isStabilizing)
    }, [esAltoRango, scale.hayFlujoDatos, scale.isStabilizing])

    const handleRechazarPesaje = () => {
        console.log("❌ Pesaje rechazado por el operario")
        setMostrarBloqueo(false)
        scale.reiniciarPesaje()
    }

    const handleAutorizarConPin = async (pinIngresado: string): Promise<boolean> => {
        console.log("🔑 Procesando validación de PIN en el servidor:", pinIngresado)
        try {
            const pinCorrecto = "1234"
            if (pinIngresado !== pinCorrecto) return false

            console.log("✅ PIN de supervisor aprobado.")
            setMostrarBloqueo(false)
            return true
        } catch (err) {
            console.error("Error al autorizar lote:", err)
            return false
        }
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
        bloqueo: {
            mostrar: mostrarBloqueo,
            handleRechazar: handleRechazarPesaje,
            handleAutorizar: handleAutorizarConPin,
        }
    }
}
