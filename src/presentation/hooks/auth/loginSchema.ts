import { z } from 'zod'

export const loginSchema = z.object({
    username: z.string({ error: 'Ingresá tu usuario' }).trim().min(1, { message: 'Ingresá tu usuario' }),
    password: z
        .string({ error: 'Ingresá tu contraseña' })
        .min(1, { message: 'Ingresá tu contraseña' })
        .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
