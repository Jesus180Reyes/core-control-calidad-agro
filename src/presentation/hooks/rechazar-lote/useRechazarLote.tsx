import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useExecuteMutation } from "../shared/useExecuteMutation"
import type { RechazarLoteSchema } from "#/presentation/schema/rechazar-lote/rechazarLoteSchema"
import { useNavigate } from "@tanstack/react-router"

export const useRechazarLote = ({ loteId }: { loteId: number }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, RechazarLoteSchema>(`/lotes/${loteId}/rechazar`, {
        method: 'PATCH',
        onSuccess: (_data) => {
            void queryClient.invalidateQueries({ queryKey: ['lotes'] });
            void queryClient.invalidateQueries({ queryKey: ['pesajes', 'byLote'] });
            toast.success(_data.msg)
            navigate({ to: '/inspeccion-clientes' });
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    return mutation
}
