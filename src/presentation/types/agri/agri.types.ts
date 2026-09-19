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
