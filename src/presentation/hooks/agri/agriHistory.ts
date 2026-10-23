import type { AgriHistoryTurn, AgriMessage } from '#/presentation/types/agri/agri.types'

/** Lo que el backend acepta en el `contenido` de cada turno del historial. */
export const MAXIMO_DEL_TURNO = 4000

/**
 * Cuántos turnos previos se mandan. El backend sólo reenvía los últimos diez al
 * modelo, así que mandar más es ancho de banda tirado.
 */
export const TURNOS_DE_HISTORIAL = 10

/**
 * El texto de una respuesta de Agri tal como la guarda el backend en su log: la
 * frase, una línea en blanco y una línea `- pregunta` por sugerencia (SPEC 48
 * del backend). Es lo que le permite al modelo entender un "la segunda". Sin
 * sugerencias, el texto sale intacto.
 */
export function withSuggestions(content: string, suggestions?: string[]): string {
    if (suggestions === undefined || suggestions.length === 0) return content

    return `${content}\n\n${suggestions.map((suggestion) => `- ${suggestion}`).join('\n')}`
}

/**
 * El hilo traducido a lo que espera el backend: sólo los turnos visibles —nunca
 * resultados de herramientas ni mensajes de sistema, que el hilo no tiene—, con
 * los roles que él nombra y recortados a su máximo, porque un `contenido` vacío
 * o de más de 4000 caracteres invalida el cuerpo entero.
 *
 * Las preguntas sugeridas se suman antes del recorte, que en la práctica nunca
 * las alcanza: la frase fija con tres preguntas no llega a 600 caracteres.
 */
export function aHistorial(mensajes: AgriMessage[]): AgriHistoryTurn[] {
    return mensajes
        .map((mensaje) => ({
            rol: mensaje.role === 'user' ? ('usuario' as const) : ('asistente' as const),
            contenido: (mensaje.role === 'agri'
                ? withSuggestions(mensaje.content, mensaje.suggestions)
                : mensaje.content
            )
                .trim()
                .slice(0, MAXIMO_DEL_TURNO),
        }))
        .filter((turno) => turno.contenido !== '')
        .slice(-TURNOS_DE_HISTORIAL)
}
