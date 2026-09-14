import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { FinishedLotesResponse } from '#/presentation/types/lotes/lotes.types'

export function useFinishedLotes({ clienteId }: { clienteId: number }) {
    const { data } = useExecuteQuery<FinishedLotesResponse>(
        ['lotes', 'cliente', clienteId, 'all', 'finalizados'],
        `/lotes/cliente/${clienteId}/all/finalizados`,
    )

    return { lotes: data.lotes }
}
