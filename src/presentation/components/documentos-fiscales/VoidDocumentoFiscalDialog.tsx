import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { useAnularDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useAnularDocumentoFiscal'
import {
    anularDocumentoFiscalSchema,
    type AnularDocumentoFiscalSchema,
} from '#/presentation/schema/documentos-fiscales/anular-documento-fiscal-schema'
import type { Documento } from '#/presentation/types/documentos-fiscales/documentos-fiscales-response'

interface VoidDocumentoFiscalDialogProps {
    documento: Documento
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function VoidDocumentoFiscalDialog({
    documento,
    open,
    onOpenChange,
}: VoidDocumentoFiscalDialogProps) {
    const {
        mutate: anularDocumento,
        isPending,
        isSuccess,
        reset,
    } = useAnularDocumentoFiscal({ documentoId: documento.id })

    const form = useForm<AnularDocumentoFiscalSchema>({
        resolver: zodResolver(anularDocumentoFiscalSchema),
    })

    const onSubmit: SubmitHandler<AnularDocumentoFiscalSchema> = (data) => {
        anularDocumento(data)
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
            title="Anular documento fiscal"
            description={`Se va a anular el ${documento.tipo_documento.toLowerCase()} "${documento.numero_completo}" de ${documento.cliente}. Esta acción no se puede deshacer.`}
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
                        form="form-anular-documento-fiscal"
                        type="submit"
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Anulando...' : 'Anular documento'}
                    </CustomButton>
                </>
            }
        >
            <FormProvider {...form}>
                <form
                    className="space-y-4"
                    id="form-anular-documento-fiscal"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <p className="text-sm text-text-muted">
                        El documento queda registrado como anulado, con el motivo y el
                        usuario que lo anuló. No se borra del historial.
                    </p>

                    <ControlledInput
                        control={form.control}
                        name="motivo"
                        label="Motivo de la anulación"
                        placeholder="Motivo de la anulación"
                        type="text"
                        uppercase
                    />
                </form>
            </FormProvider>
        </CustomDialog>
    )
}
