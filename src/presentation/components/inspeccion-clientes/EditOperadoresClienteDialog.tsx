import { Suspense, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ControlledMultiSelector } from '#/presentation/components/shared/inputs/ControlledMultiSelector'
import { useGetCatalogosOperadores } from '#/presentation/hooks/catalogos/useGetCatalogosOperadores'
import { useEditarOperadoresCliente } from '#/presentation/hooks/clientes/useEditarOperadoresCliente'
import { useGetOperadoresCliente } from '#/presentation/hooks/clientes/useGetOperadoresCliente'
import {
    editarOperadoresClienteSchema,
    type EditarOperadoresClienteSchema,
} from '#/presentation/schema/editar-operadores-cliente/editarOperadoresClienteSchema'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

const EDIT_OPERADORES_CLIENTE_FORM_ID = 'form-editar-operadores-cliente'
const DIALOG_TITLE = 'Editar operadores vinculados'

/**
 * Compara por contenido y no por orden. No se usa `isDirty` porque react-hook-form
 * compara los arrays en orden: quitar y volver a agregar un operador lo marcaría
 * como cambio.
 */
function mismoConjunto(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id))
}

interface EditOperadoresClienteDialogProps {
    cliente: Cliente
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditOperadoresClienteDialog({
    cliente,
    open,
    onOpenChange,
}: EditOperadoresClienteDialogProps) {
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    if (!open) return null

    return (
        <ErrorBoundary
            fallback={(_error, reset) => (
                <CustomDialog
                    open
                    onOpenChange={onOpenChange}
                    title={DIALOG_TITLE}
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
                        No se pudieron cargar los operadores del cliente.
                    </p>
                </CustomDialog>
            )}
        >
            <Suspense
                fallback={
                    <CustomDialog open onOpenChange={onOpenChange} title={DIALOG_TITLE} showCloseButton size="lg">
                        <LoadingState size="sm" className="py-10" />
                    </CustomDialog>
                }
            >
                <EditOperadoresClienteForm cliente={cliente} onOpenChange={onOpenChange} />
            </Suspense>
        </ErrorBoundary>
    )
}

function EditOperadoresClienteForm({
    cliente,
    onOpenChange,
}: Omit<EditOperadoresClienteDialogProps, 'open'>) {
    const { operadores } = useGetCatalogosOperadores()
    const { operadoresVinculados } = useGetOperadoresCliente({ clienteId: cliente.id })
    const { mutate: editarOperadores, isPending, isSuccess } = useEditarOperadoresCliente({ clienteId: cliente.id })

    const idsIniciales = operadoresVinculados.map((o) => o.id)

    const form = useForm<EditarOperadoresClienteSchema>({
        resolver: zodResolver(editarOperadoresClienteSchema),
        defaultValues: { usuario_ids: idsIniciales },
    })

    const seleccion = form.watch('usuario_ids')
    const sinCambios = mismoConjunto(seleccion, idsIniciales)

    const onSubmit: SubmitHandler<EditarOperadoresClienteSchema> = (data) => {
        editarOperadores({ usuario_ids: data.usuario_ids })
    }

    useEffect(() => {
        if (!isSuccess) return
        onOpenChange(false)
    }, [isSuccess])

    return (
        <CustomDialog
            open
            onOpenChange={onOpenChange}
            title={DIALOG_TITLE}
            description={`Los operadores que quite dejarán de ver a ${cliente.nombre} en su lista de clientes.`}
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
                        form={EDIT_OPERADORES_CLIENTE_FORM_ID}
                        type="submit"
                        disabled={sinCambios || seleccion.length === 0 || isPending}
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
                    id={EDIT_OPERADORES_CLIENTE_FORM_ID}
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <ControlledMultiSelector
                        control={form.control}
                        name="usuario_ids"
                        label="Operadores vinculados"
                        placeholder="Elegí uno o más operadores"
                        searchPlaceholder="Buscar operador..."
                        emptyMessage="Sin operadores"
                        options={operadores.map((item) => ({ value: item.id, label: item.nombre }))}
                    />
                </form>
            </FormProvider>
        </CustomDialog>
    )
}
