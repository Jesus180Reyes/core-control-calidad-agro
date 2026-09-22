/**
 * Lo común a los dos gestos sobre la etiqueta de un pesaje: el historial la
 * descarga (`useDownloadEtiqueta`) y `/control-calidad` la imprime
 * (`usePrintEtiqueta`). La URL del reporte vive acá y en ningún otro lado.
 */

/** Lo único que la etiqueta necesita del pesaje. */
export interface EtiquetaDePesaje {
    id: number
}

/** Las variables que viajan al servicio de reportes. */
export interface EtiquetaVariables {
    pesajeId: number
}

export const endpointEtiquetaPdf = ({ pesajeId }: EtiquetaVariables) =>
    `/reportes/pesajes/${pesajeId}/etiqueta/pdf`
