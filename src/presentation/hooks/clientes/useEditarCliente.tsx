import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useExecuteMutation } from "#/presentation/hooks/shared/useExecuteMutation"
import type { EditarClienteBody } from "#/presentation/types/clientes/clientes.types"

// Sin onError: el toast rojo lo pone useExecuteMutation.
export function useEditarCliente({ clienteId }: { clienteId: number }) {
    const queryClient = useQueryClient()

    return useExecuteMutation<{ ok: boolean, msg: string }, EditarClienteBody>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        onSuccess: (data) => {
            toast.success(data.msg)
            void queryClient.invalidateQueries({ queryKey: ['clientes'] })
        },
    })
}
