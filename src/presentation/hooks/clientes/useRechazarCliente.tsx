import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useExecuteMutation } from "#/presentation/hooks/shared/useExecuteMutation"
import type { RechazarClienteSchema } from "#/presentation/schema/rechazar-cliente/rechazarClienteSchema"

export function useRechazarCliente({ clienteId }: { clienteId: number }) {
    const queryClient = useQueryClient()

    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, RechazarClienteSchema>(`/clientes/${clienteId}/rechazar`, {
        method: 'PATCH',
        onSuccess: (_data) => {
            toast.success(_data.msg)
            void queryClient.invalidateQueries({ queryKey: ['clientes'] })
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    return mutation
}
