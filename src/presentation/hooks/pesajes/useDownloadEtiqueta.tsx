import { useCallback } from 'react'
import { toast } from 'sonner'

import { downloadUrl } from '#/presentation/helpers/file/downloadUrl'
import { endpointEtiquetaPdf, type EtiquetaDePesaje, type EtiquetaVariables } from '#/presentation/hooks/pesajes/etiquetaPesaje'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'

/** Baja la etiqueta como archivo. Es el gesto del historial; `/control-calidad` imprime. */
export function useDownloadEtiqueta() {
    const { generar, generando } = useExecutePdfMutation<EtiquetaVariables>(
        endpointEtiquetaPdf,
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
