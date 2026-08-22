import { z } from 'zod'

export const loginSchema = z.object({
    username: z.string({ error: 'El usuario es obligatorio' }),
    password: z.string({ error: 'La contraseña es obligatoria' }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;


