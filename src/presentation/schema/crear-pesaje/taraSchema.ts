import z from "zod";

/**
 * La cota superior depende de la lectura de la báscula: una tara mayor o igual
 * al peso bruto da un neto de cero o negativo, que el backend no debería recibir.
 */
export const createTaraSchema = (pesoBruto: number) =>
    z.object({
        tara: z
            .number({ error: 'Tara requerida' })
            .nonnegative('La tara no puede ser negativa')
            .lt(pesoBruto, 'La tara debe ser menor al peso bruto'),
    });

export type TaraSchema = z.infer<ReturnType<typeof createTaraSchema>>;
