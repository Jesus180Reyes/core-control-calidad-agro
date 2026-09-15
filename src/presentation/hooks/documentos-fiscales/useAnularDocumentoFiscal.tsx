import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { AnularDocumentoFiscalSchema } from '#/presentation/schema/documentos-fiscales/anular-documento-fiscal-schema'

interface UseAnularDocumentoFiscalParams {
    documentoId: number
}

export const useAnularDocumentoFiscal = ({
    documentoId,
}: UseAnularDocumentoFiscalParams) => {
    const queryClient = useQueryClient()

    const mutation = useExecuteMutation<
        { ok: boolean; msg: string },
        AnularDocumentoFiscalSchema
    >(`/documentos-fiscales/${documentoId}/anular`, {
        method: 'PATCH',
        onSuccess: (data) => {
            toast.success(data.msg)
            void queryClient.invalidateQueries({
                queryKey: ['documentos-fiscales'],
            })
        },
    })

    return mutation
}
