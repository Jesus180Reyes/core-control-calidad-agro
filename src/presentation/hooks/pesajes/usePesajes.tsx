import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
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

    /** El pesaje creado —su `id` es lo que necesita la etiqueta— o `null` si no se guardó. */
    const guardarPesaje = (pesoBruto: number, tara: number): Promise<PesajeCreado | null> => {
        if (!lote) return Promise.resolve(null)

        return mutation
            .mutateAsync({
                lote_id: lote.id,
                peso_bruto: pesoBruto,
                tara,
            })
            .then(({ pesaje }) => pesaje, () => null)
    }

    return { guardarPesaje, guardando: mutation.isPending }
}
