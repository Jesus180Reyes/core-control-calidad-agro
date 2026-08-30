import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { LotesResponse } from '#/presentation/types/lotes/lotes.types'

export function useInspeccionLotes({ clienteId }: { clienteId: number }) {
    const { data } = useExecuteQuery<LotesResponse>(
        ['lotes', 'cliente', clienteId, 'all'],
        `/lotes/cliente/${clienteId}/all`,
    )

    return { lotes: data.lotes }
}
