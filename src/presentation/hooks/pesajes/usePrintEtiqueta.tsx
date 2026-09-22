import { useCallback } from 'react'
import { toast } from 'sonner'

import { printUrl } from '#/presentation/helpers/file/printUrl'
import { endpointEtiquetaPdf, type EtiquetaDePesaje, type EtiquetaVariables } from '#/presentation/hooks/pesajes/etiquetaPesaje'
import { useExecutePdfMutation } from '#/presentation/hooks/shared/useExecutePdfMutation'

/**
 * La etiqueta de un pesaje, directo al diálogo de impresión del navegador: el
 * operario elige la impresora y el archivo nunca toca la carpeta de Descargas.
 *
 * Es el gesto de `/control-calidad`, donde se pesa bulto tras bulto. El
 * historial usa `useDownloadEtiqueta`, que baja el mismo PDF como archivo.
 */
export function usePrintEtiqueta() {
    const { generar, generando } = useExecutePdfMutation<EtiquetaVariables>(
        endpointEtiquetaPdf,
        { method: 'GET' },
    )

    /**
     * `true` si el diálogo de impresión llegó a abrirse; `false` si falló
     * pidiendo el PDF o abriendo el diálogo, que el toast rojo ya avisó.
     *
     * Que se haya abierto es lo máximo que el front puede afirmar: el navegador
     * no avisa si el operario imprimió, canceló o guardó el archivo. Por eso
     * tampoco hay toast de éxito, y quien llama confirma con el operario.
     */
    const imprimirEtiqueta = useCallback(
        async (pesaje: EtiquetaDePesaje): Promise<boolean> => {
            const avisoDeCarga = toast.loading(`Preparando la etiqueta del pesaje ${pesaje.id}…`)

            let url: string

            try {
                url = await generar({ pesajeId: pesaje.id })
            } catch {
                /* vacío a propósito */
                return false
            } finally {
                // El aviso acompaña sólo la generación: el diálogo del navegador
                // tapa la pantalla y un toast debajo no lo ve nadie.
                toast.dismiss(avisoDeCarga)
            }

            try {
                await printUrl(url)

                return true
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'No se pudo imprimir la etiqueta.')

                return false
            }
        },
        [generar],
    )

    return { imprimirEtiqueta, imprimiendo: generando }
}
