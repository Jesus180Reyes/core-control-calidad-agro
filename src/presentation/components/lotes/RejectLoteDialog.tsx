import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { useRechazarLote } from '#/presentation/hooks/rechazar-lote/useRechazarLote'
import { rechazarLoteSchema, type RechazarLoteSchema } from '#/presentation/schema/rechazar-lote/rechazarLoteSchema'
import type { Lote } from '#/presentation/types/lotes/lotes.types'

interface RejectLoteDialogProps {
    lote: Lote
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function RejectLoteDialog({
    lote,
    open,
    onOpenChange,
}: RejectLoteDialogProps) {
    const { mutate: rechazarLote, isPending, isSuccess, reset } = useRechazarLote({ loteId: lote.id })

    const form = useForm<RechazarLoteSchema>({
        resolver: zodResolver(rechazarLoteSchema),
    })

    const onSubmit: SubmitHandler<RechazarLoteSchema> = (data) => {
        rechazarLote(data)
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
            title="Rechazar lote"
            description={`Se va a rechazar el lote "${lote.nombre_lote}" (ID ${lote.id}). Esta acción no se puede deshacer.`}
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
                        form="form-rechazar-lote"
                        type="submit"
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Rechazando...' : 'Rechazar lote'}
                    </CustomButton>
                </>
            }
        >
            <FormProvider {...form}>
                <form
                    className="space-y-4"
                    id="form-rechazar-lote"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <p className="text-sm text-text-muted">
                        Confirmá el rechazo para que el lote y sus pesajes queden fuera
                        de la inspección.
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
