import z from "zod";
import type { Cliente } from "#/presentation/types/clientes/clientes.types";

const NO_VACIO = 'No se puede dejar vacío';

/**
 * Un campo que vino con dato no se puede vaciar (el backend no lo permite), pero
 * uno que vino vacío sí puede quedar en `''`: es su valor por defecto y no cuenta
 * como cambio. Por eso la regla depende del cliente precargado.
 * Los máximos son los del DTO del backend (SPEC 41).
 */
export const createEditarClienteSchema = (cliente: Cliente) => {
    const telefono = z.string().trim().max(20, 'Máximo 20 caracteres');
    const direccion = z.string().trim().max(16383, 'Máximo 16383 caracteres');

    return z.object({
        nombre: z
            .string({ error: 'Nombre requerido' })
            .trim()
            .min(1, 'El nombre es requerido')
            .max(100, 'Máximo 100 caracteres')
            .toUpperCase(),
        producto_id: z.number().int().positive('El producto_id debe ser un id valido').optional(),
        correo_contacto: z.union([
            z.literal(''),
            z.email('Correo inválido').max(100, 'Máximo 100 caracteres'),
        ]),
        telefono: cliente.telefono ? telefono.min(1, NO_VACIO) : telefono,
        direccion_planta: (cliente.direccion_planta ? direccion.min(1, NO_VACIO) : direccion).toUpperCase(),
        codigo_exportacion: z.string(),
    });
};

export type EditarClienteSchema = z.infer<ReturnType<typeof createEditarClienteSchema>>;
