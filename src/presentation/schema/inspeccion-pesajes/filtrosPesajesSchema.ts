import z from 'zod'

/**
 * Un campo que se escribió y después se borró llega como `''`, y `''` no es un
 * filtro: sin esto el `.min(1)` lo rechaza y el `parse` del submit tira.
 */
const vacioAUndefined = (valor: unknown) => (valor === '' ? undefined : valor)

export const filtrosPesajesSchema = z.object({
    usuario_id: z.coerce.number().int().positive().optional(),
    estado_calidad_id: z.coerce.number().int().positive().optional(),
    fuera_de_rango: z.enum(['true', 'false']).optional(),
    nombre: z.preprocess(vacioAUndefined, z.string().trim().min(1).toUpperCase().optional()),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
})

export type FiltrosPesajes = z.infer<typeof filtrosPesajesSchema>
