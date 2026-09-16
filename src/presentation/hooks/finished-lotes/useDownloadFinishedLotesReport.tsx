import { useCallback } from 'react'
import { toast } from 'sonner'

import type { QueryParams } from '#/infrastructure/http/http-client'
import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { EXTENSION_POR_FORMATO } from '#/presentation/helpers/file/reportExtension'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'


export type FiltrosReporteLotesFinalizados = QueryParams

type ReporteVariables = QueryParams & {
    clienteId: number
    formato: ReportFormat
}

interface DescargarReporteArgs {
    clienteId: number
    formato: ReportFormat
    nombreCliente?: string
    filtros?: FiltrosReporteLotesFinalizados
}

export function useDownloadFinishedLotesReport() {
    const { generar, generando } = useExecutePdfMutation<ReporteVariables>(
        ({ formato }) =>
            `/reportes/lotes/finalizados-por-aprobador/${formato}`,
        { method: 'GET' },
    )

    const descargarReporte = useCallback(
        async ({ clienteId, formato, nombreCliente, filtros }: DescargarReporteArgs) => {
            const avisoDeCarga = toast.loading('Descargando reporte de lotes finalizados…')

            try {
                const url = await generar({ ...filtros, clienteId, formato })
                const nombre = nombreCliente ?? `cliente-${clienteId}`

                downloadUrl(
                    url,
                    `lotes-finalizados-${nombre}.${EXTENSION_POR_FORMATO[formato]}`,
                )
                toast.success('Reporte de lotes finalizados descargado')
            } catch {
                /* vacío a propósito */
            } finally {
                toast.dismiss(avisoDeCarga)
            }
        },
        [generar],
    )

    return { descargarReporte, generando }
}
