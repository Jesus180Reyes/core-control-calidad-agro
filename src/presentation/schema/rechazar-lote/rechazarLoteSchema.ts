import z from "zod";

export const rechazarLoteSchema = z.object({
    motivo: z.string({ error: 'Motivo requerido' }).min(5, 'El motivo de rechazo debe tener al menos 5 caracteres').max(255, 'El motivo no puede exceder los 255 caracteres').toUpperCase(),
});

export type RechazarLoteSchema = z.infer<typeof rechazarLoteSchema>;
