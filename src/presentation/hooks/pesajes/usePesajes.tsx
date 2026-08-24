import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { esDeRed, esHttpError, esTimeout, mensajeDelServidor } from '#/infrastructure/http/http-client'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { Lote } from '#/presentation/types/lotes/lotes.types'
import type { CrearPesajeBody, CrearPesajeResponse } from '#/presentation/types/pesajes/pesajes.types'

/** El backend recalcula el estado real; el contrato exige el campo igual. */
const ESTADO_CALIDAD_POR_DEFECTO = 1

/** Misma escalera que `derivarErrorLogin`: cada fallo con su mensaje. */
function derivarErrorPesaje(error: unknown): string {
    if (esDeRed(error) || esTimeout(error)) return 'No se pudo contactar al servidor.'
    if (esHttpError(error)) return mensajeDelServidor(error.body) ?? 'No se pudo guardar el pesaje.'
    return 'Ocurrió un error inesperado al guardar.'
}

export function usePesajes(lote: Lote | null) {
    const queryClient = useQueryClient()
    const mutation = useExecuteMutation<CrearPesajeResponse, CrearPesajeBody>('/pesajes', {
        onSuccess: ({ msg }, { lote_id }) => {
            toast.success(msg)
            void queryClient.invalidateQueries({ queryKey: ['lotes', 'cliente', lote_id] })
        },
        onError: (error) => toast.error(derivarErrorPesaje(error)),
    })

    const guardarPesaje = (pesoBruto: number): Promise<boolean> => {
        if (!lote) return Promise.resolve(false)

        return mutation
            .mutateAsync({
                lote_id: lote.id,
                estado_calidad_id: ESTADO_CALIDAD_POR_DEFECTO,
                peso_bruto: pesoBruto,
            })
            .then(() => true, () => false)
    }

    return { guardarPesaje, guardando: mutation.isPending }
}
