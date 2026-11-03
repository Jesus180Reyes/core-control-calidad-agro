import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { CreateUserSchema } from '#/presentation/schema/crear-usuario/crearUsuarioSchema'
import type { CreateUserResponse } from '#/presentation/types/soporte/soporte.types'

export function useCreateUser() {
    const queryClient = useQueryClient()

    return useExecuteMutation<CreateUserResponse, CreateUserSchema>('/auth/register', {
        onSuccess: (data, body) => {
            toast.success(`${data.msg}: "${body.complete_name}"`)
            queryClient.invalidateQueries({ queryKey: ['usuarios'] })
        },
    })
}
