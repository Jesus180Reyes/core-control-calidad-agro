import { useQueryClient } from "@tanstack/react-query"
import { useExecuteMutation } from "../shared/useExecuteMutation"
import { toast } from "sonner"
import type { RechazarPesajeSchema } from "#/presentation/schema/rechazar-pesaje/rechazarPesajeSchema"

export const useRechazarPesaje = ({ pesajeId }: { pesajeId: number }) => {
    const queryClient = useQueryClient()
    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, RechazarPesajeSchema>(`/pesajes/${pesajeId}/rechazar`, {
        method: 'PATCH',
        onSuccess: (_data) => {
            toast.success(_data.msg);
            void queryClient.invalidateQueries({ queryKey: ['pesajes', 'byLote'] })
        },
        onError(error) {
            toast.error(error.message);
        },
    })

    return mutation;

}
