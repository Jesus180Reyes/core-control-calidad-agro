import z from 'zod'


export const createOrigenSchema = z.object({
    nombre: z.string({ error: 'Nombre requerido' }).trim().min(1, 'El nombre es requerido').max(150, 'El nombre no puede exceder los 150 caracteres'),
    direccion: z.string().trim().max(255, 'La direccion no puede exceder los 255 caracteres').optional(),
    telefono: z.string().trim().max(20, 'El telefono no puede exceder los 20 caracteres').optional()
})

export type CreateOrigenSchema = z.infer<typeof createOrigenSchema>
