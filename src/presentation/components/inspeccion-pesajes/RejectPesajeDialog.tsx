import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { rechazarPesajeSchema, type RechazarPesajeSchema } from '#/presentation/schema/rechazar-pesaje/rechazarPesajeSchema'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type SubmitErrorHandler, type SubmitHandler } from 'react-hook-form'
import { ControlledInput } from '../shared/inputs/ControlledInput'
import { useRechazarPesaje } from '#/presentation/hooks/rechazar-pesaje/useRechazarPesaje'
import { useEffect } from 'react'

interface RejectPesajeDialogProps {
    pesaje: PesajeData
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function RejectPesajeDialog({
    pesaje,
    open,
    onOpenChange,
}: RejectPesajeDialogProps) {
    const { mutate: rechazarPesaje, isPending, isSuccess } = useRechazarPesaje({ pesajeId: pesaje.id });
    const form = useForm<RechazarPesajeSchema>({
        resolver: zodResolver(rechazarPesajeSchema),
    });

    const onSubmit: SubmitHandler<RechazarPesajeSchema> = (data) => {
        rechazarPesaje(data);
        console.log(data);
    }

    const onError: SubmitErrorHandler<RechazarPesajeSchema> = (errors) => {
        console.error("Errores de validación:", errors);
    }
    useEffect(() => {
        if (!isSuccess) return;
        onOpenChange(false);
    }, [isSuccess])



    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Rechazar pesaje"

            description={`Se va a rechazar el pesaje con ID ${pesaje.id} con fecha de  ${formatDate(pesaje.created_at)}. Esta acción no se puede deshacer.`}
            showCloseButton
            size='lg'
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
                        form='form-rechazar-pesaje'
                        type="submit"
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Rechazando...' : 'Rechazar pesaje'}
                    </CustomButton>
                </>
            }
        >
            <FormProvider {...form}>
                <form
                    className="space-y-4"
                    id="form-rechazar-pesaje"
                    onSubmit={form.handleSubmit(onSubmit, onError)}
                >
                    <p className="text-sm text-text-muted">
                        Confirmá el rechazo para que el pesaje quede fuera de la
                        inspección del lote.
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
        </CustomDialog >
    )
}
