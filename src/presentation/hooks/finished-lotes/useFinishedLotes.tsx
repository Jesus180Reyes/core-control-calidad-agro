import { toDateParam } from '#/presentation/helpers/date/toDateParam'
import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { FiltrosLotesFinalizados } from '#/presentation/schema/finished-lotes/filtrosLotesFinalizadosSchema'
import type { FinishedLotesResponse } from '#/presentation/types/lotes/lotes.types'

interface UseFinishedLotesParams {
    clienteId: number
    filtros?: FiltrosLotesFinalizados
}

export function useFinishedLotes({ clienteId, filtros = {} }: UseFinishedLotesParams) {
    const { desde, hasta, ...resto } = filtros

    const params = {
        ...resto,
        desde: toDateParam(desde),
        hasta: toDateParam(hasta),
    }

    const { data } = useExecuteQuery<FinishedLotesResponse>(
        ['lotes', 'cliente', clienteId, 'all', 'finalizados', params],
        `/lotes/cliente/${clienteId}/all/finalizados`,
        { params },
    )

    return { lotes: data.lotes }
}
