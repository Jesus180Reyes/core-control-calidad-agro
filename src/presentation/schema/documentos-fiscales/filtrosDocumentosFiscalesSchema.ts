import z from 'zod'


export const filtrosDocumentosFiscalesSchema = z.object({
    cliente_id: z.coerce.number().optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
})

export type FiltrosDocumentosFiscales = z.infer<
    typeof filtrosDocumentosFiscalesSchema
>
