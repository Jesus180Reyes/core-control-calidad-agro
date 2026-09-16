import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import type { ActaReportFormat } from '#/presentation/components/lotes/DownloadActaDialog'
import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'

interface ActaVariables {
    loteId: number
    formato: ActaReportFormat
}

/** Extensión del archivo que se le ofrece al navegador, por formato. */
const EXTENSIONES: Record<ActaReportFormat, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
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
        async (lote: FinishedLote, formato: ActaReportFormat) => {
            setLoteDescargando(lote.id)

            // El error ya lo avisa el toast automático de `useExecutePdfMutation`;
            // acá sólo se corta la descarga para no abrir un archivo vacío.
            try {
                const url = await generar({ loteId: lote.id, formato })

                downloadUrl(url, `acta-${lote.nombre_lote}.${EXTENSIONES[formato]}`)
                toast.success('Acta descargada')
            } catch {
                /* vacío a propósito */
            }
        },
        [generar],
    )

    return { descargarActa, loteDescargando }
}
