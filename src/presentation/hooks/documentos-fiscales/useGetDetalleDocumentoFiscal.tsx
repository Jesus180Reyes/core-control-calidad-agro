import type { DetalleDocumentoFiscalResponse } from '#/presentation/types/documentos-fiscales/detalle-documento-fiscal-response'
import { useExecuteQuery } from '../shared/useExecuteQuery'

interface UseGetDetalleDocumentoFiscalParams {
    documentoId: number
}

export const useGetDetalleDocumentoFiscal = ({
    documentoId,
}: UseGetDetalleDocumentoFiscalParams) => {
    const { data } = useExecuteQuery<DetalleDocumentoFiscalResponse>(
        ['documentos-fiscales', 'detalle', documentoId],
        `/documentos-fiscales/${documentoId}`,
    )

    return { documento: data.documento }
}
