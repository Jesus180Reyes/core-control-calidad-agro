import z from "zod";

export const rechazarClienteSchema = z.object({
    motivo: z.string({ error: 'Motivo requerido' }).min(5, 'El motivo de rechazo debe tener al menos 5 caracteres').max(255, 'El motivo no puede exceder los 255 caracteres').toUpperCase(),
});

export type RechazarClienteSchema = z.infer<typeof rechazarClienteSchema>;
