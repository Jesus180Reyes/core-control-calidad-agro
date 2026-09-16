import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

/**
 * Extensión del archivo que se le ofrece al navegador, por formato. El formato
 * `excel` no la comparte con su nombre, así que el nombre del archivo nunca se
 * arma concatenando el formato.
 */
export const EXTENSION_POR_FORMATO: Record<ReportFormat, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
}
