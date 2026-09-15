import z from 'zod'
import { toDateParam } from '#/presentation/helpers/date/toDateParam'

const impuestoSchema = z.object({
    tarifa: z
        .number({ error: 'Tarifa requerida' })
        .nonnegative('La tarifa no puede ser negativa'),
    base_gravada: z
        .number({ error: 'Base gravada requerida' })
        .nonnegative('La base gravada no puede ser negativa'),
    impuesto: z
        .number({ error: 'Impuesto requerido' })
        .nonnegative('El impuesto no puede ser negativo'),
})

const loteSchema = z.object({
    lote_id: z
        .number({ error: 'Lote requerido' })
        .int()
        .positive('El lote_id debe ser un id valido'),
    cantidad: z
        .number({ error: 'Cantidad requerida' })
        .positive('La cantidad debe ser mayor a 0'),
    unidad_medida_id: z
        .number({ error: 'La unidad de medida debe ser un id valido' })
        .int()
        .positive('El unidad_medida_id debe ser un id valido')
        .optional(),
})

export const createDocumentoFiscalSchema = z.object({
    pais_id: z.coerce
        .number({ error: 'El pais debe ser un id valido' })
        .int()
        .positive('El pais_id debe ser un id valido'),
    cliente_id: z
        .number({ error: 'Cliente requerido' })
        .int()
        .positive('El cliente_id debe ser un id valido'),
    tipo_documento: z.enum(['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO'], {
        error: 'Tipo de documento requerido',
    }),
    numero_completo: z
        .string({ error: 'Numero de documento requerido' })
        .trim()
        .min(1, 'El numero de documento es requerido')
        .max(50, 'El numero de documento no puede exceder los 50 caracteres'),
    autorizacion:
        z.string().trim().min(1, 'La autorizacion no puede ir vacia').max(100, 'La autorizacion no puede exceder los 100 caracteres').optional(),

    fecha_emision: z.coerce
        .date({ error: 'La fecha de emision es requerida' })
        .transform((fecha) => toDateParam(fecha) ?? ''),
    moneda: z.string().trim().length(3, 'La moneda debe ser un codigo ISO 4217 de 3 letras').toUpperCase().optional(),
    tipo_cambio: z
        .number({ error: 'El tipo de cambio debe ser un numero' })
        .positive('El tipo de cambio debe ser mayor a 0'),
    importe_exento: z
        .number({ error: 'El importe exento debe ser un numero' })
        .nonnegative('El importe exento no puede ser negativo')
        .default(0),
    importe_exonerado: z
        .number({ error: 'El importe exonerado debe ser un numero' })
        .nonnegative('El importe exonerado no puede ser negativo')
        .default(0),
    total: z
        .number({ error: 'Total requerido' })
        .nonnegative('El total no puede ser negativo'),
    referencia_exencion:
        z.string().trim().min(1, 'La referencia de exencion no puede ir vacia').max(50, 'La referencia de exencion no puede exceder los 50 caracteres').optional(),

    pais_destino:
        z.string().trim().length(2, 'El pais de destino debe ser un codigo ISO 3166-1 alpha-2').toUpperCase().optional(),

    impuestos: z
        .array(impuestoSchema)
        .refine(
            (filas) => new Set(filas.map((f) => f.tarifa)).size === filas.length,
            'No puede repetirse la misma tarifa en un documento',
        )
        .optional(),
    lotes: z
        .array(loteSchema, { error: 'Lotes requeridos' })
        .min(1, 'Debe vincular al menos un lote')
        .refine(
            (filas) => new Set(filas.map((f) => f.lote_id)).size === filas.length,
            'No puede repetirse el mismo lote en un documento',
        ),
})
export type CreateDocumentoFiscalSchema = z.infer<typeof createDocumentoFiscalSchema>

/**
 * Lo que vive en el form, que no es lo mismo que la salida del schema: los
 * campos con `.default()` todavía pueden estar vacíos mientras se completa, y
 * `fecha_emision` guarda lo que le dé el date picker antes del `coerce`.
 */
export type CreateDocumentoFiscalFormValues = z.input<
    typeof createDocumentoFiscalSchema
>

export type ImpuestoDocumentoFiscalSchema = z.infer<typeof impuestoSchema>
export type LoteDocumentoFiscalSchema = z.infer<typeof loteSchema>

