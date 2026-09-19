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
     * Markdown crudo. El del usuario también: se pinta con el mismo
     * `MarkdownContent` que el de Agri, así el texto no cambia de tipografía
     * según quién lo escribió.
     */
    content: string
}
