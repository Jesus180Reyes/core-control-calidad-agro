import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { CreateOrigenResponse } from '#/presentation/types/origenes/origenes.types'
import type { CreateOrigenSchema } from '#/presentation/schema/crear-origen/createOrigenSchema'

export function useCreateOrigen() {
    const queryClient = useQueryClient()

    const mutation = useExecuteMutation<CreateOrigenResponse, CreateOrigenSchema>('/origenes', {
        onSuccess: async (data, body) => {
            toast.success(`${data.msg}: "${body.nombre}"`)
            await queryClient.invalidateQueries({ queryKey: ['origenes'] })
        },
    })

    return mutation
}
