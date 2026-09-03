import { useEffect } from 'react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { useApproveLote } from '#/presentation/hooks/approve-lote/useApproveLote'
import type { Lote } from '#/presentation/types/lotes/lotes.types'

interface ApproveLoteDialogProps {
    lote: Lote
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ApproveLoteDialog({
    lote,
    open,
    onOpenChange,
}: ApproveLoteDialogProps) {
    const { mutate: aprobarLote, isPending, isSuccess, reset } = useApproveLote({ loteId: lote.id })

    useEffect(() => {
        if (!isSuccess) return
        onOpenChange(false)
        reset()
    }, [isSuccess])

    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Aprobar lote"
            description={`Se va a aprobar el lote "${lote.nombre_lote}" (ID ${lote.id}). Esta acción no se puede deshacer.`}
            showCloseButton
            size="lg"
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        fullWidth={false}
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        variant="success"
                        fullWidth={false}
                        onClick={() => aprobarLote()}
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Aprobando...' : 'Aprobar lote'}
                    </CustomButton>
                </>
            }
        >
            <p className="text-sm text-text-muted">
                Confirmá la aprobación para que el lote y sus pesajes queden
                validados.
            </p>
        </CustomDialog>
    )
}
