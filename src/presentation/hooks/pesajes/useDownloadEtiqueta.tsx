import { useCallback } from 'react'
import { toast } from 'sonner'

import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

interface EtiquetaVariables {
    pesajeId: number
}


export function useDownloadEtiqueta() {
    const { generar, generando } = useExecutePdfMutation<EtiquetaVariables>(
        ({ pesajeId }) => `/reportes/pesajes/${pesajeId}/etiqueta/pdf`,
        { method: 'GET' },
    )

    const descargarEtiqueta = useCallback(
        async (pesaje: PesajeData) => {
            const avisoDeCarga = toast.loading(`Descargando etiqueta del pesaje ${pesaje.id}…`)

            try {
                const url = await generar({ pesajeId: pesaje.id })

                downloadUrl(url, `etiqueta-pesaje-${pesaje.id}.pdf`)
                toast.success(`Etiqueta del pesaje ${pesaje.id} descargada`)
            } catch {
                /* vacío a propósito */
            } finally {
                toast.dismiss(avisoDeCarga)
            }
        },
        [generar],
    )

    return { descargarEtiqueta, generando }
}
