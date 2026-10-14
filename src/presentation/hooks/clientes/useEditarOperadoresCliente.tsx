import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useExecuteMutation } from "#/presentation/hooks/shared/useExecuteMutation"
import type { EditarOperadoresClienteBody } from "#/presentation/types/clientes/clientes.types"

export function useEditarOperadoresCliente({ clienteId }: { clienteId: number }) {
    const queryClient = useQueryClient()

    return useExecuteMutation<{ ok: boolean, msg: string }, EditarOperadoresClienteBody>(`/clientes/${clienteId}/operadores`, {
        method: 'PATCH',
        onSuccess: async (data) => {
            toast.success(data.msg)
            void queryClient.invalidateQueries({ queryKey: ['clientes'] })
            await queryClient.invalidateQueries({ queryKey: ['clientes', clienteId, 'operadores'] });
        },
    })
}
