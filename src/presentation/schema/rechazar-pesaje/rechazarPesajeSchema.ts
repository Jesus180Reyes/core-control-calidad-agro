import z from "zod";

export const rechazarPesajeSchema = z.object({
    motivo: z.string({ error: 'Motivo requerido' }).min(5, 'El motivo de rechazo debe tener al menos 5 caracteres').max(255, 'El motivo no puede exceder los 255 caracteres').toUpperCase(),
});

export type RechazarPesajeSchema = z.infer<typeof rechazarPesajeSchema>;