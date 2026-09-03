import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { useExecuteMutation } from "../shared/useExecuteMutation"

export const useApproveLote = ({ loteId }: { loteId: number }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const mutation = useExecuteMutation<{ ok: boolean, msg: string }>(`/lotes/${loteId}/aprobar`, {
        method: 'PATCH',
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ['lotes'] });
            void queryClient.invalidateQueries({ queryKey: ['pesajes', 'byLote'] });
            toast.success(data.msg)
            navigate({ to: '/inspeccion-clientes' });
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    return mutation
}
