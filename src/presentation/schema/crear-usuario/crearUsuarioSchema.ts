import z from 'zod'


export const createUserSchema = z.object({
    username: z
        .string({ error: 'Usuario requerido' })
        .trim()
        .min(2, 'El nombre de usuario debe tener al menos 2 caracteres')
        .max(20, 'El nombre de usuario no puede exceder 20 caracteres').toUpperCase(),
    complete_name: z
        .string({ error: 'Nombre requerido' })
        .trim()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres').toUpperCase(),
    cedula: z.string({ error: 'Cédula requerida' }).trim().min(1, 'La cédula es requerida'),
    rol: z.number({ error: 'Rol requerido' }).int().positive('Rol requerido'),
})

export type CreateUserSchema = z.infer<typeof createUserSchema>
