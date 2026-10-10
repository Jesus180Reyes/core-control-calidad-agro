import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import { isInvalidAuthorizationError } from '#/presentation/hooks/pesajes/autorizacionPin'
import type { Lote } from '#/presentation/types/lotes/lotes.types'
import type { CrearPesajeBody, CrearPesajeResponse, PesajeCreado } from '#/presentation/types/pesajes/pesajes.types'



export function usePesajes(lote: Lote | null) {
    const queryClient = useQueryClient()
    const mutation = useExecuteMutation<CrearPesajeResponse, CrearPesajeBody>('/pesajes', {
        onSuccess: ({ msg }, { lote_id }) => {
            toast.success(msg)
            void queryClient.invalidateQueries({ queryKey: ['lotes', 'cliente', lote_id] })
        },
        onError: (error) => toast.error(error.message),
    });

    /**
     * El pesaje creado —su `id` es lo que necesita la etiqueta—, `null` si no
     * se guardó, o `'autorizacion-invalida'` si el backend rechazó el token del
     * supervisor y hay que volver a pedir el PIN.
     */
    const guardarPesaje = (
        pesoBruto: number,
        tara: number,
        autorizacionToken?: string,
    ): Promise<PesajeCreado | 'autorizacion-invalida' | null> => {
        if (!lote) return Promise.resolve(null)

        return mutation
            .mutateAsync({
                lote_id: lote.id,
                peso_bruto: pesoBruto,
                tara,
                // Sin PIN la clave no viaja.
                ...(autorizacionToken ? { autorizacion_token: autorizacionToken } : {}),
            })
            .then(
                ({ pesaje }) => pesaje,
                (error: unknown) => (isInvalidAuthorizationError(error) ? 'autorizacion-invalida' : null),
            )
    }

    return { guardarPesaje, guardando: mutation.isPending }
}
