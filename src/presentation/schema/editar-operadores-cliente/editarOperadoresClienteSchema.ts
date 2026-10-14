import z from "zod";

/**
 * El mínimo repite la regla del backend (SPEC 42). Con el botón deshabilitado sin
 * selección no debería dispararse, pero frena el envío con Enter.
 */
export const editarOperadoresClienteSchema = z.object({
    usuario_ids: z
        .array(z.number().int().positive(), { error: 'Operadores requeridos' })
        .min(1, 'Debe vincular al menos un operador'),
});

export type EditarOperadoresClienteSchema = z.infer<typeof editarOperadoresClienteSchema>;
