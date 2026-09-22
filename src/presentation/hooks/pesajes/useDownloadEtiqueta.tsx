import { useCallback } from 'react'
import { toast } from 'sonner'

import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'

interface EtiquetaVariables {
    pesajeId: number
}

/** Lo único que la etiqueta necesita del pesaje. */
interface EtiquetaDePesaje {
    id: number
}


export function useDownloadEtiqueta() {
    const { generar, generando } = useExecutePdfMutation<EtiquetaVariables>(
        ({ pesajeId }) => `/reportes/pesajes/${pesajeId}/etiqueta/pdf`,
        { method: 'GET' },
    )

    /** `true` si la etiqueta se descargó; `false` si falló, que el toast rojo ya avisó. */
    const descargarEtiqueta = useCallback(
        async (pesaje: EtiquetaDePesaje): Promise<boolean> => {
            const avisoDeCarga = toast.loading(`Descargando etiqueta del pesaje ${pesaje.id}…`)

            try {
                const url = await generar({ pesajeId: pesaje.id })

                downloadUrl(url, `etiqueta-pesaje-${pesaje.id}.pdf`)
                toast.success(`Etiqueta del pesaje ${pesaje.id} descargada`)

                return true
            } catch {
                /* vacío a propósito */
                return false
            } finally {
                toast.dismiss(avisoDeCarga)
            }
        },
        [generar],
    )

    return { descargarEtiqueta, generando }
}
