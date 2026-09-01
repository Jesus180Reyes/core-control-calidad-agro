import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { useRechazarCliente } from '#/presentation/hooks/clientes/useRechazarCliente'
import { rechazarClienteSchema, type RechazarClienteSchema } from '#/presentation/schema/rechazar-cliente/rechazarClienteSchema'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface RejectClienteDialogProps {
    cliente: Cliente
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function RejectClienteDialog({
    cliente,
    open,
    onOpenChange,
}: RejectClienteDialogProps) {
    const { mutate: rechazarCliente, isPending, isSuccess, reset } = useRechazarCliente({ clienteId: cliente.id })

    const form = useForm<RechazarClienteSchema>({
        resolver: zodResolver(rechazarClienteSchema),
    })

    const onSubmit: SubmitHandler<RechazarClienteSchema> = (data) => {
        rechazarCliente(data)
    }

    useEffect(() => {
        if (!isSuccess) return
        onOpenChange(false)
        reset()
    }, [isSuccess])

    useEffect(() => {
        if (open) return
        form.reset()
    }, [open])

    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Rechazar cliente"
            description={`Se va a rechazar al cliente "${cliente.nombre}" (ID ${cliente.id}). Esta acción no se puede deshacer.`}
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
                        variant="danger"
                        fullWidth={false}
                        form="form-rechazar-cliente"
                        type="submit"
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Rechazando...' : 'Rechazar cliente'}
                    </CustomButton>
                </>
            }
        >
            <FormProvider {...form}>
                <form
                    className="space-y-4"
                    id="form-rechazar-cliente"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <p className="text-sm text-text-muted">
                        Confirmá el rechazo para que el cliente quede fuera de la
                        inspección.
                    </p>

                    <ControlledInput
                        control={form.control}
                        name="motivo"
                        label="Motivo del rechazo"
                        placeholder="Motivo del rechazo"
                        type="text"
                        uppercase
                    />
                </form>
            </FormProvider>
        </CustomDialog>
    )
}
