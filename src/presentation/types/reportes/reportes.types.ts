/**
 * Formatos en los que el servicio de reportes sirve un documento. Lo comparten
 * el diálogo que lo elige y los hooks que lo piden: el string viaja tal cual al
 * final de la URL del endpoint.
 */
export type ReportFormat = 'pdf' | 'excel'
