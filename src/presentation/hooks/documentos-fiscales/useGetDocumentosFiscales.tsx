import { toDateParam } from '#/presentation/helpers/date/toDateParam'
import type { FiltrosDocumentosFiscales } from '#/presentation/schema/documentos-fiscales/filtrosDocumentosFiscalesSchema'
import type { DocumentosFiscalesResponse } from '#/presentation/types/documentos-fiscales/documentos-fiscales-response'
import { useExecuteQuery } from '../shared/useExecuteQuery'

export const useGetDocumentosFiscales = (
    filtros: FiltrosDocumentosFiscales = {},
) => {
    const { desde, hasta, ...resto } = filtros

    const params = {
        ...resto,
        desde: toDateParam(desde),
        hasta: toDateParam(hasta),
    }

    const { data } = useExecuteQuery<DocumentosFiscalesResponse>(
        ['documentos-fiscales', params],
        '/documentos-fiscales',
        { params },
    )

    return { documentos: data.documentos }
}
