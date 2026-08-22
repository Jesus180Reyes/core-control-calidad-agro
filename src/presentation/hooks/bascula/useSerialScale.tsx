import { useCallback, useEffect, useRef, useState } from 'react'
import type {
    EstadoBascula,
    InfoDesconexion,
    MotivoDesconexion,
} from '#/presentation/types/control-calidad/bascula.types'

type Temporizador = ReturnType<typeof setTimeout>
type Paridad = 'none' | 'even' | 'odd'
type ControlFlujo = 'none' | 'hardware'

interface HuellaPuerto {
    usbVendorId?: number
    usbProductId?: number
}

export interface UseSerialScaleProps {
    /** Velocidad del puerto. Debe coincidir con la configuración del indicador. */
    baudRate?: number
    dataBits?: 7 | 8
    stopBits?: 1 | 2
    parity?: Paridad
    flowControl?: ControlFlujo
    /** Lecturas con |peso| <= umbral se consideran "báscula vacía". */
    umbralCero?: number
    /** Segundos que el peso debe mantenerse quieto para darlo por estable. */
    segundosEstabilizacion?: number
    /**
     * Variación máxima (en la misma unidad que envía la báscula) tolerada
     * durante la ventana de estabilización. Si el peso se sale de esta
     * tolerancia, la cuenta regresiva se reinicia.
     * Usar `Infinity` para volver al comportamiento de solo temporizador.
     */
    toleranciaEstabilidad?: number
    /** Multiplicador aplicado a la lectura (p. ej. 1000 si el indicador envía kg y la app trabaja en g). */
    factorConversion?: number
    /** Con lecturas dentro del umbral de cero, reporta 0 exacto en lugar del valor crudo. */
    normalizarCero?: boolean
    /**
     * Milisegundos sin recibir tramas antes de avisar "sin señal".
     * El puerto NO se cierra: si los datos vuelven, el estado se recupera solo.
     * `0` desactiva el watchdog.
     */
    timeoutSinDatosMs?: number
    /** Intenta reabrir el puerto solo tras una desconexión inesperada. */
    autoReconectar?: boolean
    maxIntentosReconexion?: number
    /**
     * Resuelve qué puerto usar al reconectar. Si se omite, se mantiene la
     * búsqueda actual (huella del último puerto y, en último caso, el primero
     * autorizado). Lo provee el selector de básculas para anclar la reconexión
     * a la báscula que eligió el operario.
     */
    resolverPuertoAutorizado?: () => Promise<SerialPort | null>
    /**
     * Respeta el indicador de estabilidad del propio equipo (tramas tipo
     * `ST,GS,+00123.4kg` / `US,...`). Desactivado por defecto porque hay
     * indicadores que envían `US` de forma permanente.
     */
    usarFlagEstabilidad?: boolean
    /** Se dispara una sola vez por muestra, cuando el peso quedó estable. */
    onPesajeEstable?: (peso: number) => void | Promise<void>
    /** Se dispara en cada corte de comunicación (incluida la pérdida de señal). */
    onDesconexion?: (info: InfoDesconexion) => void
    /** Se dispara al abrir el puerto correctamente. */
    onConexion?: () => void
}

/**
 * Primer número de la trama. Tolera coma decimal, ceros a la izquierda y
 * espacios entre el signo y el valor (`+ 0012,34 kg`).
 */
const RE_NUMERO = /([-+])?\s*(\d+(?:[.,]\d+)?|[.,]\d+)/
/** Caracteres de control (NUL/STX/ETX...) que intercalan algunos indicadores. */
const RE_CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')
const RE_INESTABLE = /(?:^|[,;\s])US(?:[,;\s]|$)/i
const RE_ESTABLE = /(?:^|[,;\s])ST(?:[,;\s]|$)/i

interface TramaParseada {
    peso: number | null
    /** `null` cuando la trama no informa estabilidad. */
    estableSegunBascula: boolean | null
}

const parsearTrama = (linea: string): TramaParseada => {
    // Se descartan caracteres de control y se normalizan los espacios, sin
    // tocar el signo ni el separador decimal.
    const texto = linea.replace(RE_CONTROL, ' ').replace(/\s+/g, ' ').trim()
    if (!texto) return { peso: null, estableSegunBascula: null }

    let estableSegunBascula: boolean | null = null
    if (RE_INESTABLE.test(texto)) estableSegunBascula = false
    else if (RE_ESTABLE.test(texto)) estableSegunBascula = true

    const match = texto.match(RE_NUMERO)
    if (!match) return { peso: null, estableSegunBascula }

    const signo = match[1] === '-' ? -1 : 1
    const valor = signo * Number.parseFloat(match[2].replace(',', '.'))
    if (!Number.isFinite(valor)) return { peso: null, estableSegunBascula }

    return { peso: valor, estableSegunBascula }
}

const soportaWebSerial = () =>
    typeof navigator !== 'undefined' && 'serial' in navigator

/**
 * Web Serial lanza `DOMException`, que según el entorno no siempre hereda de
 * `Error`; por eso se leen `name`/`message` de forma defensiva.
 */
const detalleError = (err: unknown): { nombre: string; mensaje: string } => {
    if (typeof err === 'object' && err !== null) {
        const candidato = err as { name?: unknown; message?: unknown }
        return {
            nombre: typeof candidato.name === 'string' ? candidato.name : '',
            mensaje: typeof candidato.message === 'string' ? candidato.message : '',
        }
    }
    return { nombre: '', mensaje: typeof err === 'string' ? err : '' }
}

const esCancelacionDelUsuario = (err: unknown) => {
    const { nombre } = detalleError(err)
    return nombre === 'NotFoundError' || nombre === 'AbortError'
}

const esPerdidaDeDispositivo = (err: unknown) => {
    const { nombre, mensaje } = detalleError(err)
    return nombre === 'NetworkError'
        || /device (?:has been )?lost|removed|disconnected|desconect/i.test(mensaje)
}

const mensajeDeError = (err: unknown, porDefecto: string) => {
    const { nombre, mensaje } = detalleError(err)
    if (nombre === 'InvalidStateError') return 'El puerto ya está en uso por otra pestaña o programa.'
    if (nombre === 'SecurityError') return 'El navegador bloqueó el acceso al puerto serial.'
    return mensaje || porDefecto
}

const horaLocal = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('es-HN', { hour12: false })

export function useSerialScale({
    baudRate = 9600,
    dataBits = 8,
    stopBits = 1,
    parity = 'none',
    flowControl = 'none',
    umbralCero = 5,
    segundosEstabilizacion = 5,
    toleranciaEstabilidad = 5,
    factorConversion = 1,
    normalizarCero = true,
    timeoutSinDatosMs = 4000,
    autoReconectar = true,
    maxIntentosReconexion = 6,
    usarFlagEstabilidad = false,
    resolverPuertoAutorizado,
    onPesajeEstable,
    onDesconexion,
    onConexion,
}: UseSerialScaleProps = {}) {

    // ── Estado expuesto a la vista ────────────────────────────────────────────
    const [estado, setEstado] = useState<EstadoBascula>('desconectada')
    const [isSupported, setIsSupported] = useState<boolean>(true)
    const [pesoActual, setPesoActual] = useState<number>(0)
    const [pesoEstable, setPesoEstable] = useState<number | null>(null)
    const [isStabilizing, setIsStabilizing] = useState<boolean>(false)
    const [tiempoRestante, setTiempoRestante] = useState<number>(segundosEstabilizacion)
    const [error, setError] = useState<string | null>(null)
    const [desconexion, setDesconexion] = useState<InfoDesconexion | null>(null)
    const [senalRestablecida, setSenalRestablecida] = useState<boolean>(false)
    const [intentoReconexion, setIntentoReconexion] = useState<number>(0)

    // ── Configuración viva (evita closures obsoletos en el bucle de lectura) ──
    const configRef = useRef({
        baudRate, dataBits, stopBits, parity, flowControl,
        umbralCero, segundosEstabilizacion, toleranciaEstabilidad,
        factorConversion, normalizarCero, timeoutSinDatosMs,
        autoReconectar, maxIntentosReconexion, usarFlagEstabilidad,
        resolverPuertoAutorizado,
    })
    const callbacksRef = useRef({ onPesajeEstable, onDesconexion, onConexion })

    useEffect(() => {
        configRef.current = {
            baudRate, dataBits, stopBits, parity, flowControl,
            umbralCero, segundosEstabilizacion, toleranciaEstabilidad,
            factorConversion, normalizarCero, timeoutSinDatosMs,
            autoReconectar, maxIntentosReconexion, usarFlagEstabilidad,
            resolverPuertoAutorizado,
        }
        callbacksRef.current = { onPesajeEstable, onDesconexion, onConexion }
    })

    // ── Referencias de trabajo ────────────────────────────────────────────────
    const portRef = useRef<SerialPort | null>(null)
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
    const huellaRef = useRef<HuellaPuerto | null>(null)

    /** Promesa del bucle de lectura activo (se espera antes de cerrar el puerto). */
    const bucleRef = useRef<Promise<void> | null>(null)

    const seguirLeyendoRef = useRef<boolean>(false)
    const cierreIntencionalRef = useRef<boolean>(false)
    const montadoRef = useRef<boolean>(true)

    const pesoFlujoRef = useRef<number>(0)
    const objetoEnBasculaRef = useRef<boolean>(false)
    const pesajeCompletadoRef = useRef<boolean>(false)
    const referenciaEstabilidadRef = useRef<number>(0)
    const inicioEstabilidadRef = useRef<number | null>(null)

    const ultimaTramaRef = useRef<number>(0)
    const avisoSinSenalRef = useRef<boolean>(false)

    const tickerRef = useRef<Temporizador | null>(null)
    const watchdogRef = useRef<Temporizador | null>(null)
    const reconexionTimerRef = useRef<Temporizador | null>(null)
    const senalTimerRef = useRef<Temporizador | null>(null)
    const intentosRef = useRef<number>(0)

    // ── Helpers de temporizadores ─────────────────────────────────────────────
    const detenerTicker = useCallback(() => {
        if (tickerRef.current) {
            clearInterval(tickerRef.current)
            tickerRef.current = null
        }
    }, [])

    const detenerWatchdog = useCallback(() => {
        if (watchdogRef.current) {
            clearInterval(watchdogRef.current)
            watchdogRef.current = null
        }
    }, [])

    const cancelarReconexionProgramada = useCallback(() => {
        if (reconexionTimerRef.current) {
            clearTimeout(reconexionTimerRef.current)
            reconexionTimerRef.current = null
        }
    }, [])

    /** Deja la máquina de pesaje en cero, sin tocar el puerto. */
    const reiniciarEstabilizacion = useCallback(() => {
        detenerTicker()
        objetoEnBasculaRef.current = false
        pesajeCompletadoRef.current = false
        inicioEstabilidadRef.current = null
        referenciaEstabilidadRef.current = 0
        setIsStabilizing(false)
        setTiempoRestante(configRef.current.segundosEstabilizacion)
    }, [detenerTicker])

    // ── Estabilización ────────────────────────────────────────────────────────
    const confirmarPesaje = useCallback(() => {
        const peso = pesoFlujoRef.current
        if (Math.abs(peso) <= configRef.current.umbralCero) {
            reiniciarEstabilizacion()
            return
        }

        pesajeCompletadoRef.current = true
        inicioEstabilidadRef.current = null
        detenerTicker()
        setIsStabilizing(false)
        setTiempoRestante(0)
        setPesoEstable(peso)

        try {
            const resultado = callbacksRef.current.onPesajeEstable?.(peso)
            if (resultado instanceof Promise) {
                resultado.catch((err) => console.error('Error en onPesajeEstable:', err))
            }
        } catch (err) {
            console.error('Error en onPesajeEstable:', err)
        }
    }, [detenerTicker, reiniciarEstabilizacion])

    /**
     * Un único ticker gobierna la cuenta regresiva y el cierre de la ventana,
     * de modo que ambos no puedan desincronizarse.
     */
    const iniciarTicker = useCallback(() => {
        detenerTicker()
        tickerRef.current = setInterval(() => {
            const inicio = inicioEstabilidadRef.current
            if (inicio === null) {
                detenerTicker()
                return
            }
            const duracion = configRef.current.segundosEstabilizacion * 1000
            const restanteMs = duracion - (Date.now() - inicio)
            const restanteSeg = Math.max(0, Math.ceil(restanteMs / 1000))
            setTiempoRestante((prev) => (prev === restanteSeg ? prev : restanteSeg))
            if (restanteMs <= 0) confirmarPesaje()
        }, 200)
    }, [confirmarPesaje, detenerTicker])

    const procesarLectura = useCallback((pesoCrudo: number, estableSegunBascula: boolean | null) => {
        const {
            umbralCero: umbral,
            toleranciaEstabilidad: tolerancia,
            segundosEstabilizacion: segundos,
            factorConversion: factor,
            normalizarCero: normalizar,
            usarFlagEstabilidad: usarFlag,
        } = configRef.current

        const peso = Math.round(pesoCrudo * factor * 100) / 100
        pesoFlujoRef.current = peso

        const basculaVacia = Math.abs(peso) <= umbral
        setPesoActual(basculaVacia && normalizar ? 0 : peso)

        if (basculaVacia) {
            if (objetoEnBasculaRef.current || pesajeCompletadoRef.current) reiniciarEstabilizacion()
            return
        }

        // Muestra ya confirmada: se espera a que retiren el producto (o a reiniciarPesaje()).
        if (pesajeCompletadoRef.current) return

        if (!objetoEnBasculaRef.current) {
            objetoEnBasculaRef.current = true
            referenciaEstabilidadRef.current = peso
            inicioEstabilidadRef.current = Date.now()
            setIsStabilizing(true)
            setTiempoRestante(segundos)
            iniciarTicker()
            return
        }

        const fueraDeTolerancia = Math.abs(peso - referenciaEstabilidadRef.current) > tolerancia
        const inestableSegunEquipo = usarFlag && estableSegunBascula === false

        if (fueraDeTolerancia || inestableSegunEquipo) {
            // El peso se movió: la ventana de estabilización empieza de nuevo.
            referenciaEstabilidadRef.current = peso
            inicioEstabilidadRef.current = Date.now()
            setTiempoRestante(segundos)
            if (!tickerRef.current) iniciarTicker()
        }
    }, [iniciarTicker, reiniciarEstabilizacion])

    // ── Avisos de desconexión ─────────────────────────────────────────────────
    const reportarDesconexion = useCallback((
        motivo: MotivoDesconexion,
        mensaje: string,
        recuperable = false,
    ) => {
        const timestamp = Date.now()
        const interrumpioPesaje = objetoEnBasculaRef.current && !pesajeCompletadoRef.current

        const info: InfoDesconexion = {
            motivo,
            mensaje,
            recuperable,
            interrumpioPesaje,
            hora: horaLocal(timestamp),
            timestamp,
            pesoAlDesconectar: pesoFlujoRef.current,
        }

        if (!recuperable) {
            // El pesaje en curso ya no es confiable: se invalida.
            reiniciarEstabilizacion()
            setPesoActual(0)
            setPesoEstable(null)
            pesoFlujoRef.current = 0
        }

        setSenalRestablecida(false)
        setDesconexion(info)
        setError(mensaje)

        try {
            callbacksRef.current.onDesconexion?.(info)
        } catch (err) {
            console.error('Error en onDesconexion:', err)
        }
    }, [reiniciarEstabilizacion])

    const marcarSenalRestablecida = useCallback(() => {
        avisoSinSenalRef.current = false
        setDesconexion((prev) => (prev?.recuperable ? null : prev))
        setError(null)
        setSenalRestablecida(true)
        if (senalTimerRef.current) clearTimeout(senalTimerRef.current)
        senalTimerRef.current = setTimeout(() => setSenalRestablecida(false), 4000)
    }, [])

    // ── Watchdog: puerto abierto pero báscula muda ────────────────────────────
    const iniciarWatchdog = useCallback(() => {
        detenerWatchdog()
        ultimaTramaRef.current = Date.now()
        watchdogRef.current = setInterval(() => {
            const { timeoutSinDatosMs: limite } = configRef.current
            if (!limite || !portRef.current || avisoSinSenalRef.current) return

            const silencio = Date.now() - ultimaTramaRef.current
            if (silencio < limite) return

            avisoSinSenalRef.current = true
            setEstado((prev) => (prev === 'conectada' ? 'sin-senal' : prev))
            reportarDesconexion(
                'sin-senal',
                `La báscula dejó de enviar lecturas hace ${Math.round(silencio / 1000)} s. ` +
                'Verifique que el indicador esté encendido y el cable serial conectado.',
                true,
            )
        }, 1000)
    }, [detenerWatchdog, reportarDesconexion])

    const registrarTrama = useCallback(() => {
        ultimaTramaRef.current = Date.now()
        if (avisoSinSenalRef.current) {
            marcarSenalRestablecida()
            setEstado((prev) => (prev === 'sin-senal' ? 'conectada' : prev))
        }
    }, [marcarSenalRestablecida])

    // ── Cierre del puerto ─────────────────────────────────────────────────────
    const cerrarPuerto = useCallback(async () => {
        seguirLeyendoRef.current = false
        detenerWatchdog()
        detenerTicker()

        const reader = readerRef.current
        if (reader) {
            // cancel() resuelve el read() pendiente; el bucle libera el lock en su finally.
            try { await reader.cancel() } catch { /* el stream ya estaba roto */ }
        }

        const puerto = portRef.current
        portRef.current = null

        if (puerto) {
            // Se espera a que el bucle termine y libere el lock del stream:
            // sin eso, port.close() falla con "The port is already locked".
            const bucle = bucleRef.current
            bucleRef.current = null
            if (bucle) {
                try { await bucle } catch { /* el bucle ya reportó su error */ }
            }
            if (readerRef.current) {
                try { readerRef.current.releaseLock() } catch { /* ya liberado */ }
                readerRef.current = null
            }
            try {
                await puerto.close()
            } catch (err) {
                console.warn('No se pudo cerrar el puerto limpiamente:', err)
            }
        }
    }, [detenerTicker, detenerWatchdog])

    // ── Reconexión automática ─────────────────────────────────────────────────
    const buscarPuertoAutorizado = useCallback(async (): Promise<SerialPort | null> => {
        if (!soportaWebSerial()) return null

        // Si hay un resolvedor externo (el selector de básculas), su respuesta
        // manda: sin respaldo a puertos[0], que con dos básculas autorizadas
        // reconectaría contra la equivocada.
        const { resolverPuertoAutorizado: resolver } = configRef.current
        if (resolver) {
            try {
                return await resolver()
            } catch {
                return null
            }
        }

        try {
            const puertos = await navigator.serial.getPorts()
            if (!puertos.length) return null

            const huella = huellaRef.current
            if (huella?.usbVendorId !== undefined) {
                const coincidencia = puertos.find((puerto) => {
                    const info = puerto.getInfo()
                    return info.usbVendorId === huella.usbVendorId
                        && info.usbProductId === huella.usbProductId
                })
                if (coincidencia) return coincidencia
            }
            return puertos[0] ?? null
        } catch {
            return null
        }
    }, [])

    /** Declarada como ref para romper la dependencia circular conectar ⇄ reconectar. */
    const intentarReconexionRef = useRef<() => Promise<void>>(async () => { })

    const programarReconexion = useCallback(() => {
        const { autoReconectar: activo, maxIntentosReconexion: maxIntentos } = configRef.current
        if (!activo || !montadoRef.current) return

        if (intentosRef.current >= maxIntentos) {
            setEstado('desconectada')
            setError(
                `No se pudo restablecer la conexión con la báscula tras ${maxIntentos} intentos. ` +
                'Reconéctela manualmente.',
            )
            return
        }

        const intento = intentosRef.current + 1
        intentosRef.current = intento
        setIntentoReconexion(intento)
        setEstado('reconectando')

        cancelarReconexionProgramada()
        const espera = Math.min(1000 * 2 ** (intento - 1), 15000)
        reconexionTimerRef.current = setTimeout(() => {
            void intentarReconexionRef.current()
        }, espera)
    }, [cancelarReconexionProgramada])

    // ── Bucle de lectura ──────────────────────────────────────────────────────
    const bucleLectura = useCallback(async (puerto: SerialPort) => {
        const decoder = new TextDecoder()
        let buffer = ''
        let motivo: MotivoDesconexion | null = null
        let mensaje = ''

        try {
            const legible = puerto.readable
            if (!legible) throw new Error('El puerto abierto no expone un flujo de lectura.')

            const reader = legible.getReader()
            readerRef.current = reader

            try {
                while (seguirLeyendoRef.current) {
                    const { value, done } = await reader.read()
                    if (done) {
                        if (seguirLeyendoRef.current) {
                            motivo = 'stream'
                            mensaje = 'La báscula cerró la comunicación de forma inesperada.'
                        }
                        break
                    }
                    if (!value) continue

                    registrarTrama()
                    buffer += decoder.decode(value, { stream: true })

                    // El indicador puede terminar líneas con \r\n, \r o \n.
                    const lineas = buffer.split(/\r\n|\r|\n/)
                    buffer = lineas.pop() ?? ''
                    // Trama sin terminador: se evita que el buffer crezca sin control.
                    if (buffer.length > 1024) buffer = buffer.slice(-256)

                    for (const linea of lineas) {
                        const { peso, estableSegunBascula } = parsearTrama(linea)
                        if (peso === null) continue
                        procesarLectura(peso, estableSegunBascula)
                    }
                }
            } finally {
                try { reader.releaseLock() } catch { /* el stream ya estaba cerrado */ }
                if (readerRef.current === reader) readerRef.current = null
            }
        } catch (err) {
            if (seguirLeyendoRef.current) {
                motivo = esPerdidaDeDispositivo(err) ? 'cable' : 'stream'
                mensaje = esPerdidaDeDispositivo(err)
                    ? 'Se perdió el dispositivo: revise el cable USB / adaptador serial de la báscula.'
                    : mensajeDeError(err, 'Error de lectura en el puerto de la báscula.')
            }
        }

        // El bucle ya liberó el lock: se descuelga de la referencia para que
        // cerrarPuerto() no se quede esperándose a sí mismo.
        bucleRef.current = null

        if (!motivo || cierreIntencionalRef.current) return

        await cerrarPuerto()
        if (!montadoRef.current) return
        setEstado('desconectada')
        reportarDesconexion(motivo, mensaje)
        programarReconexion()
    }, [cerrarPuerto, procesarLectura, programarReconexion, registrarTrama, reportarDesconexion])

    // ── Conexión ──────────────────────────────────────────────────────────────
    const conectar = useCallback(async (
        opciones: { puerto?: SerialPort; silencioso?: boolean } = {},
    ): Promise<boolean> => {
        if (!soportaWebSerial()) {
            setEstado('no-soportada')
            setError('Este navegador no soporta Web Serial. Use Chrome o Edge de escritorio.')
            return false
        }
        if (portRef.current) return true

        const { puerto: puertoPrevio, silencioso = false } = opciones

        try {
            setError(null)
            setEstado(silencioso ? 'reconectando' : 'conectando')

            const puerto = puertoPrevio ?? await navigator.serial.requestPort()
            const { baudRate: br, dataBits: db, stopBits: sb, parity: pr, flowControl: fc } = configRef.current
            await puerto.open({ baudRate: br, dataBits: db, stopBits: sb, parity: pr, flowControl: fc })

            portRef.current = puerto
            const info = puerto.getInfo()
            huellaRef.current = { usbVendorId: info.usbVendorId, usbProductId: info.usbProductId }

            cierreIntencionalRef.current = false
            seguirLeyendoRef.current = true
            avisoSinSenalRef.current = false
            cancelarReconexionProgramada()

            const veniaDeCorte = intentosRef.current > 0 || silencioso
            intentosRef.current = 0
            setIntentoReconexion(0)
            setDesconexion(null)
            setEstado('conectada')
            reiniciarEstabilizacion()
            iniciarWatchdog()
            if (veniaDeCorte) marcarSenalRestablecida()

            try {
                callbacksRef.current.onConexion?.()
            } catch (err) {
                console.error('Error en onConexion:', err)
            }

            // Sin await: el bucle vive mientras el puerto esté abierto y no debe
            // bloquear a quien llamó a conectar().
            bucleRef.current = bucleLectura(puerto)
            return true
        } catch (err) {
            if (esCancelacionDelUsuario(err) && !puertoPrevio) {
                setEstado('desconectada')
                return false
            }
            await cerrarPuerto()
            if (!montadoRef.current) return false
            setError(mensajeDeError(err, 'No se pudo abrir el puerto de la báscula.'))
            setEstado('error')
            return false
        }
    }, [
        bucleLectura, cancelarReconexionProgramada, cerrarPuerto,
        iniciarWatchdog, marcarSenalRestablecida, reiniciarEstabilizacion,
    ])

    useEffect(() => {
        intentarReconexionRef.current = async () => {
            if (!montadoRef.current || portRef.current) return
            const puerto = await buscarPuertoAutorizado()
            if (!puerto) {
                // El dispositivo sigue ausente: se reintenta con backoff.
                programarReconexion()
                return
            }
            const conectado = await conectar({ puerto, silencioso: true })
            if (!conectado) programarReconexion()
        }
    }, [buscarPuertoAutorizado, conectar, programarReconexion])

    /** Desconexión pedida por el operario: no genera alerta ni reconexión. */
    const desconectar = useCallback(async () => {
        cierreIntencionalRef.current = true
        cancelarReconexionProgramada()
        intentosRef.current = 0
        avisoSinSenalRef.current = false

        await cerrarPuerto()

        reiniciarEstabilizacion()
        pesoFlujoRef.current = 0
        huellaRef.current = null
        if (!montadoRef.current) return
        setPesoActual(0)
        setPesoEstable(null)
        setIntentoReconexion(0)
        setDesconexion(null)
        setError(null)
        setSenalRestablecida(false)
        setEstado(soportaWebSerial() ? 'desconectada' : 'no-soportada')
    }, [cancelarReconexionProgramada, cerrarPuerto, reiniciarEstabilizacion])

    /** Reintento manual: reusa el puerto ya autorizado y, si no hay, pide uno. */
    const reconectar = useCallback(async (): Promise<boolean> => {
        cancelarReconexionProgramada()
        intentosRef.current = 0
        setIntentoReconexion(0)

        // Puerto abierto y con tramas llegando: no hay nada que reintentar.
        if (portRef.current && !avisoSinSenalRef.current) return true

        if (portRef.current) {
            // Estado 'sin-senal': el puerto sigue abierto pero mudo. Reintentar
            // solo tiene sentido si se cierra y se reabre el enlace; de lo
            // contrario el operario pulsa el botón y no ocurre nada.
            setEstado('reconectando')
            cierreIntencionalRef.current = true
            await cerrarPuerto()
            avisoSinSenalRef.current = false
            if (!montadoRef.current) return false
        }

        const puerto = await buscarPuertoAutorizado()
        return conectar(puerto ? { puerto, silencioso: true } : {})
    }, [buscarPuertoAutorizado, cancelarReconexionProgramada, cerrarPuerto, conectar])

    /** Permite tomar otra muestra sin retirar el producto de la plataforma. */
    const reiniciarPesaje = useCallback(() => {
        reiniciarEstabilizacion()
        setPesoEstable(null)
    }, [reiniciarEstabilizacion])

    /** Cierra el aviso de desconexión sin cambiar el estado del puerto. */
    const descartarAviso = useCallback(() => {
        setDesconexion(null)
        setSenalRestablecida(false)
    }, [])

    // ── Eventos del navegador: USB conectado / desconectado ───────────────────
    useEffect(() => {
        montadoRef.current = true

        if (!soportaWebSerial()) {
            setIsSupported(false)
            setEstado('no-soportada')
            setError('Este navegador no soporta Web Serial. Use Chrome o Edge de escritorio.')
            return
        }

        setIsSupported(true)
        const serial = navigator.serial

        const alDesconectar = (event: Event) => {
            const puertoActivo = portRef.current
            if (!puertoActivo) return

            // Según la versión de Chrome el puerto viaja en `event.target` o en
            // `event.port`. Si no se puede identificar, se asume que es el nuestro.
            const posible = (event as Event & { port?: SerialPort }).port ?? event.target
            const puertoAfectado = posible && typeof (posible as SerialPort).getInfo === 'function'
                ? posible as SerialPort
                : null
            if (puertoAfectado && puertoAfectado !== puertoActivo) return

            void (async () => {
                await cerrarPuerto()
                if (!montadoRef.current) return
                setEstado('desconectada')
                reportarDesconexion(
                    'cable',
                    'Se perdió la conexión física con la báscula (cable USB o adaptador serial desconectado).',
                )
                programarReconexion()
            })()
        }

        const alConectar = () => {
            // El dispositivo volvió a aparecer: adelanta el próximo reintento.
            if (portRef.current || !configRef.current.autoReconectar) return
            if (intentosRef.current === 0) return
            cancelarReconexionProgramada()
            void intentarReconexionRef.current()
        }

        serial.addEventListener('disconnect', alDesconectar)
        serial.addEventListener('connect', alConectar)

        return () => {
            serial.removeEventListener('disconnect', alDesconectar)
            serial.removeEventListener('connect', alConectar)
        }
    }, [cancelarReconexionProgramada, cerrarPuerto, programarReconexion, reportarDesconexion])

    // ── Limpieza al desmontar ─────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            montadoRef.current = false
            cierreIntencionalRef.current = true
            seguirLeyendoRef.current = false
            detenerTicker()
            detenerWatchdog()
            cancelarReconexionProgramada()
            if (senalTimerRef.current) clearTimeout(senalTimerRef.current)
            void cerrarPuerto()
        }
    }, [cancelarReconexionProgramada, cerrarPuerto, detenerTicker, detenerWatchdog])

    const isConnected = estado === 'conectada' || estado === 'sin-senal'

    return {
        // --- API original (compatible) ---
        pesoActual,
        isConnected,
        isStabilizing,
        tiempoRestante,
        error,
        connectSerial: conectar,
        disconnectSerial: desconectar,

        // --- Diagnóstico del enlace ---
        estado,
        isSupported,
        isConnecting: estado === 'conectando',
        isReconnecting: estado === 'reconectando',
        /** Puerto abierto y tramas llegando. */
        hayFlujoDatos: estado === 'conectada',
        /** Puerto abierto pero la báscula no transmite. */
        sinSenal: estado === 'sin-senal',
        desconexion,
        senalRestablecida,
        intentoReconexion,
        maxIntentosReconexion,

        // --- Acciones ---
        reconectar,
        reiniciarPesaje,
        descartarAviso,

        // --- Datos de pesaje ---
        /** Peso confirmado como estable (null mientras no haya muestra válida). */
        pesoEstable,
        pesajeConfirmado: pesoEstable !== null,
    }
}

export type UseSerialScaleReturn = ReturnType<typeof useSerialScale>
