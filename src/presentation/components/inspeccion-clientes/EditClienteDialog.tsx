import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import { useEditarCliente } from '#/presentation/hooks/clientes/useEditarCliente'
import { createEditarClienteSchema, type EditarClienteSchema } from '#/presentation/schema/editar-cliente/editarClienteSchema'
import type { Cliente, EditarClienteBody } from '#/presentation/types/clientes/clientes.types'

const EDIT_CLIENTE_FORM_ID = 'form-editar-cliente'

// `codigo_exportacion` queda afuera a propósito: se muestra, pero nunca viaja.
const EDITABLE_FIELDS = ['nombre', 'producto_id', 'correo_contacto', 'telefono', 'direccion_planta'] as const

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
 * Se monta solo mientras está abierto: `useForm` toma los valores de la fila al
 * montarse y al cerrar se descarta lo tipeado, sin `form.reset()`. Suspende por
 * el catálogo de productos, así que va dentro de `Suspense` + `ErrorBoundary`.
 */
export function EditClienteDialog({
    cliente,
    open,
    onOpenChange,
}: EditClienteDialogProps) {
    const { productos } = useGetCatalogosProductos()
    const { mutate: editarCliente, isPending, isSuccess } = useEditarCliente({ clienteId: cliente.id })

    const form = useForm<EditarClienteSchema>({
        resolver: zodResolver(createEditarClienteSchema(cliente)),
        defaultValues: {
            nombre: cliente.nombre,
            // La fila trae el nombre del producto, no su id: si no coincide con
            // el catálogo, el selector arranca vacío y el producto no se envía.
            producto_id: productos.find((p) => p.nombre === cliente.producto)?.id,
            correo_contacto: '',
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
            open={open}
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
                            name="codigo_exportacion"
                            label="Código de exportación"
                            disabled
                        />
                        <ControlledInput
                            control={form.control}
                            name="correo_contacto"
                            label="Correo de contacto"
                            type="email"
                            placeholder="Sin cambios"
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
