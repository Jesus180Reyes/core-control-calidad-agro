import z from 'zod'

export const anularDocumentoFiscalSchema = z.object({
    motivo: z
        .string({ error: 'Motivo requerido' })
        .trim()
        .min(5, 'El motivo de anulacion debe tener al menos 5 caracteres')
        .max(255, 'El motivo no puede exceder los 255 caracteres').toUpperCase(),
})

export type AnularDocumentoFiscalSchema = z.infer<
    typeof anularDocumentoFiscalSchema
>
