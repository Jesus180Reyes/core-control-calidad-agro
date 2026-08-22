import { z } from 'zod'

export const loginSchema = z.object({
    username: z.string({ error: 'El usuario es obligatorio' }),
    password: z.string({ error: 'La contraseña es obligatoria' }).min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;


