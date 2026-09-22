/** Quién escribió el mensaje. */
export type AgriRole = 'user' | 'agri'

export interface AgriMessage {
    /**
     * `crypto.randomUUID()`. Es la key de la lista, y de eso depende que la
     * animación palabra por palabra corra sólo en la burbuja que llega: con el
     * índice del array como key, cada mensaje nuevo remontaría a los anteriores
     * y el hilo entero se volvería a escribir solo.
     */
    id: string
    role: AgriRole
    /**
     * El de Agri es markdown y se pinta con `MarkdownContent`. El del usuario
     * se muestra tal cual se tipeó, sin interpretar: nadie espera que su propio
     * `**hola**` le salga en negrita.
     */
    content: string
}

/**
 * Cómo nombra el backend a cada lado de la conversación en el historial. No son
 * los mismos strings que `AgriRole`, que es lo que la pantalla usa para pintar:
 * cualquier otro valor (`user`, `assistant`, `model`, `system`) es un 400.
 */
export type AgriHistoryRole = 'usuario' | 'asistente'

/** Un turno ya enviado, tal como viaja en `historial`. */
export interface AgriHistoryTurn {
    rol: AgriHistoryRole
    contenido: string
}

/** Cuerpo de `POST /chat`. */
export interface AgriChatRequest {
    /** Trimmeado y no vacío; el backend corta en 500 caracteres. */
    mensaje: string
    /**
     * UUID del hilo, sólo para agrupar los turnos en el log del backend. Es
     * opcional, pero un valor que no sea UUID —o un `''`, o un `null`— es un
     * 400: cuando no hay UUID que mandar, la clave se omite.
     */
    conversacion?: string
    /** Los turnos previos. El backend sólo reenvía los últimos diez al modelo. */
    historial?: AgriHistoryTurn[]
}

/** Respuesta de `POST /chat`. */
export interface AgriChatResponse {
    ok: boolean
    msg: string
    /**
     * Markdown crudo, que se pinta con `MarkdownContent` —sin HTML crudo—,
     * igual que el `resumen` de un lote.
     *
     * También llega por acá lo que en otra API sería un error: si el modelo
     * falla o el usuario agotó su límite diario, el backend contesta 200 con la
     * explicación escrita acá. Para la pantalla es un mensaje más de Agri.
     */
    respuesta: string
}

/** Respuesta de `GET /chat/sugerencias`. */
export interface AgriSugerenciasResponse {
    ok: boolean
    msg: string
    /**
     * Las frases de arranque de la pantalla vacía. El backend devuelve siempre
     * tres, en **texto plano**: se pintan tal cual, sin `MarkdownContent`.
     *
     * Si el usuario tiene cartera nombran clientes suyos; si no —un aprobador,
     * un admin— vienen tres genéricas. La pantalla no distingue los dos casos.
     */
    sugerencias: string[]
}
