import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { CreateClienteSchema } from '#/presentation/schema/crear-cliente/crearClienteSchema'

export function useCrearCliente() {
    const queryClient = useQueryClient();
    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, CreateClienteSchema>('/clientes', {
        onSuccess: (_data, body) => {
            toast.success(`${_data.msg}: "${body.nombre}"`)
            queryClient.invalidateQueries({ queryKey: ['clientes'] })
        },
        onError(error) {
            toast.error(`Error al crear cliente: ${error.message}`)
        },
    })

    return mutation;
}
