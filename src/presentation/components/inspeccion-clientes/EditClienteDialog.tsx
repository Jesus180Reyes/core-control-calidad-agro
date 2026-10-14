import { Suspense, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import { useEditarCliente } from '#/presentation/hooks/clientes/useEditarCliente'
import { createEditarClienteSchema, type EditarClienteSchema } from '#/presentation/schema/editar-cliente/editarClienteSchema'
import type { Cliente, EditarClienteBody } from '#/presentation/types/clientes/clientes.types'

const EDIT_CLIENTE_FORM_ID = 'form-editar-cliente'

// `codigo_exportacion` queda afuera a propósito: se muestra, pero nunca viaja.
const EDITABLE_FIELDS = ['nombre', 'producto_id', 'telefono', 'direccion_planta'] as const

/**
 * Solo los campos que el usuario tocó. Un `''` no viaja: el schema ya impide
 * vaciar un campo que vino con dato, así que uno vacío es un campo que vino
 * vacío (por ejemplo, unos espacios que el `trim` dejó en nada).
 */
function pickDirty(
    data: EditarClienteSchema,
    dirtyFields: Partial<Record<keyof EditarClienteSchema, boolean>>,
): EditarClienteBody {
    return Object.fromEntries(
        EDITABLE_FIELDS
            .filter((campo) => dirtyFields[campo])
            .map((campo) => [campo, data[campo]])
            .filter(([, valor]) => valor !== undefined && valor !== ''),
    )
}

interface EditClienteDialogProps {
    cliente: Cliente
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * El formulario se monta solo mientras el diálogo está abierto: `useForm` toma
 * los valores de la fila al montarse y al cerrar se descarta lo tipeado, sin
 * `form.reset()`. Suspende por el catálogo de productos; los fallbacks son el
 * mismo diálogo con el spinner o el error adentro, porque pintados en la fila
 * deformarían la celda de acciones de la tabla.
 */
export function EditClienteDialog({
    cliente,
    open,
    onOpenChange,
}: EditClienteDialogProps) {
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    if (!open) return null

    return (
        <ErrorBoundary
            fallback={(_error, reset) => (
                <CustomDialog
                    open
                    onOpenChange={onOpenChange}
                    title="Editar cliente"
                    showCloseButton
                    size="lg"
                    footer={
                        <>
                            <CustomButton variant="secondary" fullWidth={false} onClick={() => onOpenChange(false)}>
                                Cerrar
                            </CustomButton>
                            <CustomButton
                                fullWidth={false}
                                onClick={() => {
                                    limpiarErrorDeQuery()
                                    reset()
                                }}
                            >
                                Reintentar
                            </CustomButton>
                        </>
                    }
                >
                    <p className="text-sm text-text-muted">
                        No se pudo cargar el catálogo de productos.
                    </p>
                </CustomDialog>
            )}
        >
            <Suspense
                fallback={
                    <CustomDialog open onOpenChange={onOpenChange} title="Editar cliente" showCloseButton size="lg">
                        <LoadingState size="sm" className="py-10" />
                    </CustomDialog>
                }
            >
                <EditClienteForm cliente={cliente} onOpenChange={onOpenChange} />
            </Suspense>
        </ErrorBoundary>
    )
}

function EditClienteForm({
    cliente,
    onOpenChange,
}: Omit<EditClienteDialogProps, 'open'>) {
    const { productos } = useGetCatalogosProductos()
    const { mutate: editarCliente, isPending, isSuccess } = useEditarCliente({ clienteId: cliente.id })

    const form = useForm<EditarClienteSchema>({
        resolver: zodResolver(createEditarClienteSchema(cliente)),
        defaultValues: {
            nombre: cliente.nombre,
            producto_id: productos.find((p) => p.nombre === cliente.producto)?.id,
            telefono: cliente.telefono ?? '',
            direccion_planta: cliente.direccion_planta ?? '',
            codigo_exportacion: cliente.codigo_exportacion ?? '',
        },
    })

    const onSubmit: SubmitHandler<EditarClienteSchema> = (data) => {
        editarCliente(pickDirty(data, form.formState.dirtyFields))
    }

    useEffect(() => {
        if (!isSuccess) return
        onOpenChange(false)
    }, [isSuccess])

    return (
        <CustomDialog
            open
            onOpenChange={onOpenChange}
            title="Editar cliente"
            description="Cambie los datos y pulse Guardar cambios."
            showCloseButton
            size="lg"
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        fullWidth={false}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        fullWidth={false}
                        form={EDIT_CLIENTE_FORM_ID}
                        type="submit"
                        disabled={!form.formState.isDirty || isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Guardando...' : 'Guardar cambios'}
                    </CustomButton>
                </>
            }
        >
            <FormProvider {...form}>
                <form
                    className="space-y-4"
                    id={EDIT_CLIENTE_FORM_ID}
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ControlledInput
                            control={form.control}
                            name="nombre"
                            label="Nombre"
                            placeholder="Agroexportadora S.A."
                        />
                        <ControlledInput
                            control={form.control}
                            name="telefono"
                            label="Teléfono"
                            type="tel"
                            placeholder="+504 9999-9999"
                        />
                        <ControlledInput
                            control={form.control}
                            name="direccion_planta"
                            label="Dirección de planta"
                            placeholder="Km 12 carretera al norte"
                            className="sm:col-span-2"
                        />
                    </div>
                    <ControlledSelector
                        control={form.control}
                        name="producto_id"
                        label="Producto"
                        placeholder="Sin cambios"
                        options={productos.map((item) => ({ value: item.id, label: item.nombre }))}
                        valueAsNumber
                        showSearch
                    />
                </form>
            </FormProvider>
        </CustomDialog>
    )
}
