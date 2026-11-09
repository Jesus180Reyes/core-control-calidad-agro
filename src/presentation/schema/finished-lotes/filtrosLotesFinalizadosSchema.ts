import z from 'zod'

export const filtrosLotesFinalizadosSchema = z
    .object({
        nombre: z.string().trim().min(1).toUpperCase().optional(),
        producto_id: z.coerce.number().int().positive().optional(),
        origen_id: z.coerce.number().int().positive().optional(),
        desde: z.coerce.date().optional(),
        hasta: z.coerce.date().optional(),
    })
    .refine((filtros) => !filtros.desde || !filtros.hasta || filtros.desde <= filtros.hasta, {
        path: ['hasta'],
        message: 'La fecha final no puede ser anterior a la inicial',
    })

export type FiltrosLotesFinalizados = z.infer<typeof filtrosLotesFinalizadosSchema>

export function countActiveFilters(filtros: FiltrosLotesFinalizados) {
    return Object.values(filtros).filter((valor) => valor !== undefined && valor !== '').length
}
