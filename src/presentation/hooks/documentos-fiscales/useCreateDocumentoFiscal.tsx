import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { CreateDocumentoFiscalSchema } from '#/presentation/schema/documentos-fiscales/create-documento-fiscal-schema'

export function useCreateDocumentoFiscal() {
    const queryClient = useQueryClient()

    const mutation = useExecuteMutation<
        { ok: boolean; msg: string },
        CreateDocumentoFiscalSchema
    >('/documentos-fiscales', {
        onSuccess: (data, body) => {
            toast.success(`${data.msg}: "${body.numero_completo}"`)
            queryClient.invalidateQueries({ queryKey: ['documentos-fiscales'] })
        },
    })

    return mutation
}
