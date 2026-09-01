import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useExecuteMutation } from "../shared/useExecuteMutation"
import type { RechazarLoteSchema } from "#/presentation/schema/rechazar-lote/rechazarLoteSchema"

export const useRechazarLote = ({ loteId }: { loteId: number }) => {
    const queryClient = useQueryClient()

    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, RechazarLoteSchema>(`/lotes/${loteId}/rechazar`, {
        method: 'PATCH',
        onSuccess: (_data) => {
            toast.success(_data.msg)
            void queryClient.invalidateQueries({ queryKey: ['lotes'] })
            void queryClient.invalidateQueries({ queryKey: ['pesajes', 'byLote'] })
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    return mutation
}
