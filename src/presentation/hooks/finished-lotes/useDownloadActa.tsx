import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { EXTENSION_POR_FORMATO } from '#/presentation/helpers/file/reportExtension'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

interface ActaVariables {
    loteId: number
    formato: ReportFormat
}

/**
 * Descarga el acta de entrega de un lote en PDF o Excel.
 *
 * Los dos formatos salen por el mismo transporte binario (`parsear: 'blob'`),
 * que además corta el 2xx que llega como JSON: sin esa rama se bajaría un
 * "PDF" que en realidad es el mensaje de error del backend.
 *
 * El GET no lleva cuerpo: `useExecutePdfMutation` manda las variables como
 * query params, así que el pedido sale `/lotes/{id}/acta?loteId=..&formato=..`
 * —el `loteId` repetido en la query es ruido inofensivo—. La pantalla monta un
 * solo hook para todas las cards, y `loteDescargando` dice cuál está en curso.
 *
 * El acta **no lleva filtros** y no va a llevarlos: es el documento de un lote
 * puntual, no un listado. El que sí se filtra es el reporte de lotes
 * finalizados del cliente (`useDownloadFinishedLotesReport`).
 *
 * El endpoint todavía no existe en el backend: hasta que exista, la descarga
 * termina en el toast de error.
 */
export function useDownloadActa() {
    const [loteDescargando, setLoteDescargando] = useState<number | null>(null)

    const { generar } = useExecutePdfMutation<ActaVariables>(
        ({ loteId, formato }) => `/reportes/lotes/${loteId}/acta-entrega/${formato}`,
        {
            method: 'GET',
            onSettled: () => setLoteDescargando(null),
        },
    )

    const descargarActa = useCallback(
        async (lote: FinishedLote, formato: ReportFormat) => {
            const avisoDeCarga = toast.loading(`Descargando acta de lote ${lote.nombre_lote}…`)
            setLoteDescargando(lote.id)

            try {
                const url = await generar({ loteId: lote.id, formato })

                downloadUrl(url, `acta-${lote.nombre_lote}.${EXTENSION_POR_FORMATO[formato]}`)
                toast.success(`Acta de lote ${lote.nombre_lote} descargada`)
            } catch {
                /* vacío a propósito */
            } finally {
                toast.dismiss(avisoDeCarga)
            }
        },
        [generar],
    )

    return { descargarActa, loteDescargando }
}
