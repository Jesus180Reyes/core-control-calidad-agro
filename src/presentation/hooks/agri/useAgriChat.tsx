import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type {
    AgriChatRequest,
    AgriChatResponse,
    AgriHistoryTurn,
    AgriMessage,
    AgriRole,
} from '#/presentation/types/agri/agri.types'

/** Lo que el backend acepta en `mensaje` antes de contestar 400. */
const MAXIMO_DEL_MENSAJE = 500

/** Lo que el backend acepta en el `contenido` de cada turno del historial. */
const MAXIMO_DEL_TURNO = 4000

/**
 * Cuántos turnos previos se mandan. El backend sólo reenvía los últimos diez al
 * modelo, así que mandar más es ancho de banda tirado.
 */
const TURNOS_DE_HISTORIAL = 10

let contadorDeMensajes = 0

/**
 * `crypto.randomUUID` sólo existe en un contexto seguro, y en planta la app
 * puede estar servida por HTTP plano. El contador alcanza como respaldo: el id
 * únicamente tiene que ser único dentro de este hilo, que muere al recargar.
 */
function crearId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    contadorDeMensajes += 1
    return `agri-${contadorDeMensajes}`
}

/**
 * El id del hilo que viaja en `conversacion`, y que el backend usa sólo para
 * agrupar los turnos en su log.
 *
 * Acá el respaldo del `crearId` no sirve: el campo se valida como UUID y un
 * `agri-3` es un 400. `getRandomValues`, a diferencia de `randomUUID`, no pide
 * contexto seguro, así que de ahí sale el UUID v4 en la tablet servida por HTTP
 * plano. Si no hubiera ninguno de los dos, `null` y la clave no se manda: el
 * campo es opcional y lo único que se pierde es el agrupado en el log.
 */
function crearConversacion(): string | null {
    if (typeof crypto === 'undefined') return null
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    if (typeof crypto.getRandomValues !== 'function') return null

    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function crearMensaje(role: AgriRole, content: string): AgriMessage {
    return { id: crearId(), role, content }
}

/**
 * El hilo traducido a lo que espera el backend: sólo los turnos visibles —nunca
 * resultados de herramientas ni mensajes de sistema, que el hilo no tiene—, con
 * los roles que él nombra y recortados a su máximo, porque un `contenido` vacío
 * o de más de 4000 caracteres invalida el cuerpo entero.
 */
function aHistorial(mensajes: AgriMessage[]): AgriHistoryTurn[] {
    return mensajes
        .map((mensaje) => ({
            rol: mensaje.role === 'user' ? ('usuario' as const) : ('asistente' as const),
            contenido: mensaje.content.trim().slice(0, MAXIMO_DEL_TURNO),
        }))
        .filter((turno) => turno.contenido !== '')
        .slice(-TURNOS_DE_HISTORIAL)
}

/**
 * El hilo de Agri, el chat IA de `/agri`.
 *
 * Cada envío es un `POST /chat` que lleva el mensaje, el id del hilo y los
 * turnos previos: el backend no guarda la conversación, así que el contexto lo
 * pone el front en cada turno.
 *
 * El hilo vive en memoria a propósito: recargar la página lo vacía. No hay
 * `localStorage` ni backend de conversaciones.
 */
export function useAgriChat() {
    const [messages, setMessages] = useState<AgriMessage[]>([])
    const [conversacion, setConversacion] = useState(crearConversacion)

    const { mutate, isPending, reset } = useExecuteMutation<AgriChatResponse, AgriChatRequest>(
        '/chat',
    )

    /**
     * Manda un turno. `previos` es el hilo **sin** el mensaje que se está
     * mandando: ése viaja aparte, en `mensaje`.
     */
    const preguntar = useCallback(
        (mensaje: string, previos: AgriMessage[]) => {
            const cuerpo: AgriChatRequest = { mensaje, historial: aHistorial(previos) }
            if (conversacion !== null) cuerpo.conversacion = conversacion

            mutate(cuerpo, {
                // El `onSuccess` va acá y no en las opciones del hook a
                // propósito: éste es el callback de la llamada, y `reset()` lo
                // desengancha. Es lo que hace que la respuesta de un turno
                // abandonado no caiga dentro de la conversación nueva.
                onSuccess: ({ respuesta }) => {
                    setMessages((actuales) => [...actuales, crearMensaje('agri', respuesta)])
                },
            })
        },
        [conversacion, mutate],
    )

    const sendMessage = useCallback(
        (content: string) => {
            const texto = content.trim()
            // Un mensaje vacío no se manda, y mientras Agri responde tampoco:
            // dos respuestas en vuelo dejarían el hilo desordenado.
            if (texto === '' || isPending) return

            // El largo se corta acá en vez de dejar que vuelva el 400: el turno
            // ya contaría contra el límite diario del usuario.
            if (texto.length > MAXIMO_DEL_MENSAJE) {
                toast.error(`El mensaje no puede pasar de ${MAXIMO_DEL_MENSAJE} caracteres.`)
                return
            }

            setMessages((previos) => [...previos, crearMensaje('user', texto)])
            preguntar(texto, messages)
        },
        [isPending, messages, preguntar],
    )

    /**
     * Descarta la última respuesta de Agri y vuelve a pedirla sobre el mismo
     * mensaje del usuario, que queda donde estaba.
     */
    const regenerate = useCallback(() => {
        if (isPending) return

        // Sólo se regenera la última burbuja, y sólo si es de Agri: regenerar
        // una del medio dejaría el hilo contestando a otra pregunta.
        if (messages.at(-1)?.role !== 'agri') return

        const sinLaRespuesta = messages.slice(0, -1)
        const pregunta = sinLaRespuesta.at(-1)
        if (pregunta === undefined || pregunta.role !== 'user') return

        setMessages(sinLaRespuesta)
        preguntar(pregunta.content, sinLaRespuesta.slice(0, -1))
    }, [isPending, messages, preguntar])

    const startNewChat = useCallback(() => {
        // Un hilo nuevo es una conversación nueva también para el backend, y el
        // `reset` corta el turno que estuviera en vuelo: baja el "pensando" ya
        // mismo y su respuesta, si llega, no entra en el hilo nuevo.
        reset()
        setMessages([])
        setConversacion(crearConversacion())
    }, [reset])

    return {
        messages,
        /** Agri está redactando: la vista pinta el indicador de tres puntos. */
        isThinking: isPending,
        sendMessage,
        regenerate,
        startNewChat,
    }
}
