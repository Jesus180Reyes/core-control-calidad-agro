import z from 'zod'


export const filtrosReporteLotesFinalizadosSchema = z.object({
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
    cliente_id: z.number().optional(),
})

export type FiltrosReporteLotesFinalizados = z.infer<
    typeof filtrosReporteLotesFinalizadosSchema
>
