import { useCallback } from 'react'
import { toast } from 'sonner'

import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { toDateParam } from '#/presentation/helpers/date/toDateParam'
import { EXTENSION_POR_FORMATO } from '#/presentation/helpers/file/reportExtension'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'
import type { FiltrosReporteLotesFinalizados } from '#/presentation/schema/reportes/filtrosReporteLotesFinalizadosSchema'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

/**
 * Variables de la petición, ya con los nombres que espera el endpoint
 * (`cliente_id`, `desde`, `hasta` en `YYYY-MM-DD`). El `formato` también viaja
 * como query param además de ir en la URL; el backend ignora lo que no conoce.
 */
type ReporteVariables = {
    formato: ReportFormat
    cliente_id?: number
    desde?: string
    hasta?: string
}

interface DescargarReporteArgs {
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
        async ({ formato, nombreCliente, filtros }: DescargarReporteArgs) => {
            const avisoDeCarga = toast.loading('Descargando reporte de lotes finalizados…')

            try {
                const url = await generar({
                    formato,
                    cliente_id: filtros?.cliente_id,
                    desde: toDateParam(filtros?.desde),
                    hasta: toDateParam(filtros?.hasta),
                })
                const nombre = nombreCliente ?? `cliente-${filtros?.cliente_id}`

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
