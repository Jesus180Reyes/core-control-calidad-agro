import { useCallback, useEffect, useRef, useState } from 'react'

import {
    DEMORA_RESPUESTA_MS,
    RESPUESTA_DE_EJEMPLO,
} from '#/presentation/hooks/agri/agriMockResponse'
import type { AgriMessage, AgriRole } from '#/presentation/types/agri/agri.types'

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

function crearMensaje(role: AgriRole, content: string): AgriMessage {
    return { id: crearId(), role, content }
}

/**
 * El hilo de Agri, el chat IA de `/agri`.
 *
 * Hoy la respuesta sale del mock de `agriMockResponse`, porque el endpoint del
 * chat todavía no existe. Cuando exista, **este archivo es el único que
 * cambia**: la vista y sus componentes no saben de dónde viene el texto.
 *
 * El hilo vive en memoria a propósito: recargar la página lo vacía. No hay
 * `localStorage` ni backend de conversaciones.
 */
export function useAgriChat() {
    const [messages, setMessages] = useState<AgriMessage[]>([])
    const [isThinking, setIsThinking] = useState(false)
    const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const limpiarTemporizador = useCallback(() => {
        if (temporizadorRef.current === null) return

        clearTimeout(temporizadorRef.current)
        temporizadorRef.current = null
    }, [])

    // Si el usuario se va de /agri mientras Agri "piensa", el timer no
    // sobrevive a la pantalla: sin esto, su `setState` cae sobre un componente
    // ya desmontado.
    useEffect(() => limpiarTemporizador, [limpiarTemporizador])

    /** Prende el "pensando" y agenda la respuesta. */
    const responder = useCallback(() => {
        limpiarTemporizador()
        setIsThinking(true)

        temporizadorRef.current = setTimeout(() => {
            temporizadorRef.current = null
            setMessages((previos) => [...previos, crearMensaje('agri', RESPUESTA_DE_EJEMPLO)])
            setIsThinking(false)
        }, DEMORA_RESPUESTA_MS)
    }, [limpiarTemporizador])

    const sendMessage = useCallback(
        (content: string) => {
            const texto = content.trim()
            // Un mensaje vacío no se manda, y mientras Agri responde tampoco:
            // dos respuestas en vuelo dejarían el hilo desordenado.
            if (texto === '' || isThinking) return

            setMessages((previos) => [...previos, crearMensaje('user', texto)])
            responder()
        },
        [isThinking, responder],
    )

    /**
     * Descarta la última respuesta de Agri y vuelve a pedirla sobre el mismo
     * mensaje del usuario, que queda donde estaba.
     */
    const regenerate = useCallback(() => {
        if (isThinking) return

        // Sólo se regenera la última burbuja, y sólo si es de Agri: regenerar
        // una del medio dejaría el hilo contestando a otra pregunta.
        if (messages.at(-1)?.role !== 'agri') return

        setMessages((previos) => previos.slice(0, -1))
        responder()
    }, [isThinking, messages, responder])

    const startNewChat = useCallback(() => {
        limpiarTemporizador()
        setMessages([])
        setIsThinking(false)
    }, [limpiarTemporizador])

    return {
        messages,
        /** Agri está redactando: la vista pinta el indicador de tres puntos. */
        isThinking,
        sendMessage,
        regenerate,
        startNewChat,
    }
}
