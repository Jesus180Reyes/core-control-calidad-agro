import z from 'zod'

export const filtrosHistorialSchema = z.object({
    lote_id: z.coerce.number().int().positive().optional(),
    cliente_id: z.coerce.number().int().positive().optional(),
    estado_calidad_id: z.coerce.number().int().positive().optional(),
    fuera_de_rango: z.enum(['true', 'false']).optional(),
    nombre: z.string().trim().min(1).optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
});

export type FiltrosHistorial = z.infer<typeof filtrosHistorialSchema>
