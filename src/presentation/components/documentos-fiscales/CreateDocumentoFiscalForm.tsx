import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { useGetCatalogosUnidadMedida } from '#/presentation/hooks/catalogos/useGetCatalogosUnidadMedida'
import { useClientInspection } from '#/presentation/hooks/inspeccion-clientes/useClientInspection'
import type { CreateDocumentoFiscalFormValues } from '#/presentation/schema/documentos-fiscales/create-documento-fiscal-schema'
import { useFinishedLotes } from '#/presentation/hooks/finished-lotes/useFinishedLotes'

export const CREATE_DOCUMENTO_FISCAL_FORM_ID = 'form-crear-documento-fiscal'

type ImpuestoRow = CreateDocumentoFiscalFormValues['impuestos']
type LoteRow = CreateDocumentoFiscalFormValues['lotes'][number]


const filaImpuestoVacia = () =>
    ({
        tarifa: undefined,
        base_gravada: undefined,
        impuesto: undefined,
    }) as unknown as NonNullable<ImpuestoRow>[number]

const filaLoteVacia = () =>
    ({
        lote_id: undefined,
        cantidad: undefined,
        unidad_medida_id: undefined,
    }) as unknown as LoteRow

/** Un campo vacío del form llega como `undefined`, y `Number('')` daría 0. */
function aNumero(valor: unknown): number {
    const numero = Number(valor)

    return Number.isFinite(numero) ? numero : 0
}

/**
 * `total = importe_exento + importe_exonerado + Σ (base_gravada + impuesto)`.
 *
 * Redondea a dos decimales: sumar los importes en punto flotante deja colas
 * (`0.1 + 0.2`) que el backend rechaza contra el total declarado.
 */
export function calcularTotalDocumento(
    importeExento: unknown,
    importeExonerado: unknown,
    impuestos: ImpuestoRow,
): number {
    const gravado = (impuestos ?? []).reduce(
        (acumulado, fila) =>
            acumulado + aNumero(fila?.base_gravada) + aNumero(fila?.impuesto),
        0,
    )

    const total = aNumero(importeExento) + aNumero(importeExonerado) + gravado

    return Math.round(total * 100) / 100
}



const TIPOS_DOCUMENTO = [
    { value: 'FACTURA', label: 'Factura' },
    { value: 'NOTA_CREDITO', label: 'Nota de crédito' },
    { value: 'NOTA_DEBITO', label: 'Nota de débito' },
]
const PAISES_CONFIG = [
    { value: '1', label: 'Honduras' },
    { value: '3', label: 'Nicaragua' },
]
const PAISES_DESTINO = [
    { value: 'HN', label: 'Honduras' },
    { value: 'MX', label: 'México' },
    { value: 'NI', label: 'Nicaragua' },
    { value: 'PA', label: 'Panamá' },
    { value: 'SV', label: 'El Salvador' },
    { value: 'US', label: 'Estados Unidos' },
    { value: 'VE', label: 'Venezuela' },
    { value: 'AR', label: 'Argentina' },
    { value: 'BO', label: 'Bolivia' },
    { value: 'CL', label: 'Chile' },
    { value: 'CO', label: 'Colombia' },
    { value: 'CR', label: 'Costa Rica' },
    { value: 'EC', label: 'Ecuador' },
    { value: 'GT', label: 'Guatemala' },
    { value: 'PE', label: 'Perú' },
    { value: 'PY', label: 'Paraguay' },
    { value: 'UY', label: 'Uruguay' },
    { value: 'BR', label: 'Brasil' },
    { value: 'CU', label: 'Cuba' },
    { value: 'DO', label: 'Dominicana' },
    { value: 'EC', label: 'Ecuador' },
    { value: 'GT', label: 'Guatemala' },
    { value: 'CN', label: 'China' },
    { value: 'TW', label: 'Taiwan' },
]
export const MONEDAS_CONFIG = [
    { value: 'HNL', label: 'Lempira' },
    { value: 'NIO', label: 'Cordoba' },
    { value: 'USD', label: 'Dolar' },
]

export function CreateDocumentoFiscalForm() {
    const { control } = useFormContext<CreateDocumentoFiscalFormValues>()
    const { clientes } = useClientInspection()

    return (
        <div className="space-y-6">
            <FormSection
                title="Datos del documento"
                description="El cliente, el número y la fecha con la que se emitió."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <ControlledSelector
                        control={control}
                        name="cliente_id"
                        label="Cliente"
                        placeholder="Elegí el cliente"
                        valueAsNumber
                        showSearch
                        searchPlaceholder="Buscar cliente..."
                        emptyMessage="Sin clientes"
                        options={clientes.map((cliente) => ({
                            value: cliente.id,
                            label: cliente.nombre,
                        }))}
                    />
                    <ControlledSelector
                        control={control}
                        name="pais_id"
                        label="País Emisor"
                        placeholder="Elegí el país"
                        valueAsNumber
                        showSearch
                        searchPlaceholder="Buscar país..."
                        emptyMessage="Sin países"
                        options={PAISES_CONFIG}
                    />
                    <ControlledSelector
                        control={control}
                        name="tipo_documento"
                        label="Tipo de documento"
                        placeholder="Elegí el tipo"
                        options={TIPOS_DOCUMENTO}
                    />
                    <ControlledInput
                        control={control}
                        name="numero_completo"
                        label="Número del documento"
                        placeholder="000-001-01-00000001"
                        uppercase
                    />
                    <ControlledDatePicker
                        control={control}
                        name="fecha_emision"
                        label="Fecha de emisión"
                        placeholder="Elegí la fecha"
                        maxDate={new Date()}
                    />
                    <ControlledInput
                        control={control}
                        name="autorizacion"
                        label="Autorización (opcional)"
                        placeholder="CAI / número de autorización"
                        uppercase
                    />
                    <ControlledSelector
                        control={control}
                        name="pais_destino"
                        label="País de destino"
                        placeholder="Elegí el país"
                        options={PAISES_DESTINO}
                    />
                </div>
            </FormSection>

            <FormSection
                title="Importes"
                description="La moneda vacía toma la del país configurado; el total lo calcula el formulario."
            >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <ControlledSelector
                        control={control}
                        name="moneda"
                        label="Moneda (opcional)"
                        placeholder="HNL"
                        options={MONEDAS_CONFIG}
                    />
                    <ControlledInput
                        control={control}
                        name="tipo_cambio"
                        label="Tipo de cambio"
                        type="number"
                        placeholder="1"
                        valueAsNumber
                    />
                    <ControlledInput
                        control={control}
                        name="importe_exento"
                        label="Importe exento"
                        type="number"
                        placeholder="0.00"
                        valueAsNumber
                    />
                    <ControlledInput
                        control={control}
                        name="importe_exonerado"
                        label="Importe exonerado"
                        type="number"
                        placeholder="0.00"
                        valueAsNumber
                    />
                    <TotalField />
                    {/*
                      Último de la sección y a fila completa: el número de
                      resolución es largo, y arriba del todo dejaba a los
                      importes chocados en media columna.
                    */}
                    <ControlledInput
                        control={control}
                        name="referencia_exencion"
                        label="Referencia de exención (opcional)"
                        placeholder="Resolución de exoneración"
                        uppercase
                        className="sm:col-span-2 xl:col-span-3"
                    />
                </div>
            </FormSection>

            <ImpuestosSection />

            <LotesSection />
        </div>
    )
}


function TotalField() {
    const { control, setValue } = useFormContext<CreateDocumentoFiscalFormValues>()

    const importeExento = useWatch({ control, name: 'importe_exento' })
    const importeExonerado = useWatch({ control, name: 'importe_exonerado' })
    const impuestos = useWatch({ control, name: 'impuestos' })

    const total = calcularTotalDocumento(
        importeExento,
        importeExonerado,
        impuestos,
    )

    useEffect(() => {
        setValue('total', total, { shouldValidate: true })
    }, [total])

    return (
        <ControlledInput
            control={control}
            name="total"
            label="Total (calculado)"
            type="number"
            placeholder="0.00"
            valueAsNumber
            disabled
        />
    )
}

function ImpuestosSection() {
    const {
        control,
        formState: { errors },
    } = useFormContext<CreateDocumentoFiscalFormValues>()
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'impuestos',
    })

    // La tarifa repetida la valida un `refine` del array entero, así que el
    // error no cae en ningún campo: sin esto sólo se veía por consola.
    const errorSeccion = errors.impuestos?.root?.message ?? errors.impuestos?.message

    return (
        <FormSection
            title="Impuestos"
            description="Una fila por tarifa; el documento puede emitirse sin ninguna."
            action={
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    icon={<Plus className="size-4" />}
                    onClick={() => append(filaImpuestoVacia())}
                >
                    Agregar impuesto
                </CustomButton>
            }
        >
            <SectionError message={errorSeccion} />

            {fields.length === 0 && (
                <p className="rounded-xl border border-dashed border-border-ui px-4 py-6 text-center text-sm text-text-muted">
                    Sin impuestos aplicados.
                </p>
            )}

            {fields.map((field, index) => (
                <FormRow
                    key={field.id}
                    onRemove={() => remove(index)}
                    removeLabel={`Quitar el impuesto ${index + 1}`}
                >
                    <ControlledInput
                        control={control}
                        name={`impuestos.${index}.tarifa`}
                        label="Tarifa %"
                        type="number"
                        placeholder="15"
                        valueAsNumber
                    />
                    <ControlledInput
                        control={control}
                        name={`impuestos.${index}.base_gravada`}
                        label="Base gravada"
                        type="number"
                        placeholder="0.00"
                        valueAsNumber
                    />
                    <ControlledInput
                        control={control}
                        name={`impuestos.${index}.impuesto`}
                        label="Impuesto"
                        type="number"
                        placeholder="0.00"
                        valueAsNumber
                    />
                </FormRow>
            ))}
        </FormSection>
    )
}

function LotesSection() {
    const {
        control,
        formState: { errors },
    } = useFormContext<CreateDocumentoFiscalFormValues>()
    const clienteId = useWatch({ control, name: 'cliente_id' })
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'lotes',
    })

    // Tanto el lote repetido como el "al menos un lote" son reglas del array,
    // no de una fila: se pintan acá o no se ven en ningún lado.
    const errorSeccion = errors.lotes?.root?.message ?? errors.lotes?.message

    const clienteAnterior = useRef(clienteId)
    useEffect(() => {
        if (clienteAnterior.current === clienteId) return

        clienteAnterior.current = clienteId
        replace([filaLoteVacia()])
    }, [clienteId])

    return (
        <FormSection
            title="Lotes"
            description="El documento necesita al menos un lote vinculado."
            action={
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    disabled={!clienteId}
                    icon={<Plus className="size-4" />}
                    onClick={() => append(filaLoteVacia())}
                >
                    Agregar lote
                </CustomButton>
            }
        >
            <SectionError message={errorSeccion} />

            {!clienteId ? (
                <p className="rounded-xl border border-dashed border-border-ui px-4 py-6 text-center text-sm text-text-muted">
                    Elegí primero el cliente para ver sus lotes.
                </p>
            ) : (
                <Suspense fallback={<LoadingState label="Cargando lotes..." />}>
                    {fields.map((field, index) => (
                        <FormRow
                            key={field.id}
                            onRemove={fields.length > 1 ? () => remove(index) : undefined}
                            removeLabel={`Quitar el lote ${index + 1}`}
                        >
                            <LoteRowFields index={index} clienteId={clienteId} />
                        </FormRow>
                    ))}
                </Suspense>
            )}
        </FormSection>
    )
}

interface LoteRowFieldsProps {
    index: number
    clienteId: number
}

function LoteRowFields({ index, clienteId }: LoteRowFieldsProps) {
    const { control } = useFormContext<CreateDocumentoFiscalFormValues>()
    const { lotes } = useFinishedLotes({ clienteId })
    const { unidadesMedidas } = useGetCatalogosUnidadMedida()

    return (
        <>
            <ControlledSelector
                control={control}
                name={`lotes.${index}.lote_id`}
                label="Lote"
                placeholder="Elegí el lote"
                valueAsNumber
                showSearch
                searchPlaceholder="Buscar lote..."
                emptyMessage="El cliente no tiene lotes"
                options={lotes.map((lote) => ({
                    value: lote.id,
                    label: lote.nombre_lote,
                }))}
            />
            <ControlledInput
                control={control}
                name={`lotes.${index}.cantidad`}
                label="Cantidad"
                type="number"
                placeholder="0.00"
                valueAsNumber
            />
            <ControlledSelector
                control={control}
                name={`lotes.${index}.unidad_medida_id`}
                label="Unidad de medida"
                placeholder="La del lote"
                valueAsNumber
                options={unidadesMedidas.map((unidad) => ({
                    value: unidad.id,
                    label: unidad.nombre,
                }))}
            />
        </>
    )
}

interface FormSectionProps {
    title: string
    description: string
    action?: ReactNode
    children: ReactNode
}

function FormSection({
    title,
    description,
    action,
    children,
}: FormSectionProps) {
    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-black text-text-main">{title}</h3>
                    <p className="text-xs text-text-muted">{description}</p>
                </div>
                {action}
            </div>

            {children}
        </section>
    )
}

/**
 * El error de una sección entera: las reglas que miran todas las filas juntas
 * —tarifa repetida, lote repetido, "al menos un lote"— no tienen un campo donde
 * caer. Va como banner y no como el `FieldError` de un input porque lo que está
 * mal es la lista, no el casillero que el operario tiene el cursor encima.
 */
function SectionError({ message }: { message?: string }) {
    if (!message) return null

    return (
        <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-500"
        >
            <AlertCircle className="size-4 shrink-0" />
            {message}
        </p>
    )
}

interface FormRowProps {
    /** Sin callback la fila no se puede quitar: es el caso del último lote. */
    onRemove?: () => void
    removeLabel: string
    children: ReactNode
}

function FormRow({ onRemove, removeLabel, children }: FormRowProps) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border-ui bg-bg-app p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">{children}</div>

            <button
                type="button"
                onClick={onRemove}
                disabled={!onRemove}
                aria-label={removeLabel}
                className="mt-6 shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-muted"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    )
}
