/**
 * Las dos partes del detalle de un documento fiscal. La elección del usuario
 * viaja en la URL (`?seccion=`), así que el valor se valida antes de confiar en
 * él: puede venir escrito a mano o de un enlace viejo.
 */
export const DOCUMENTO_FISCAL_SECTIONS = ['impuestos', 'lotes'] as const

export type DocumentoFiscalSection = (typeof DOCUMENTO_FISCAL_SECTIONS)[number]

export function isDocumentoFiscalSection(
    valor: unknown,
): valor is DocumentoFiscalSection {
    return DOCUMENTO_FISCAL_SECTIONS.some((seccion) => seccion === valor)
}
