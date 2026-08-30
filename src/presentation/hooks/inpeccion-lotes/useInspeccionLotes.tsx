import { useExecuteQuery } from "../shared/useExecuteQuery"
import type { LotesResponse } from '../../types/lotes/lotes.types';

export const useInspeccionLotes = ({ clienteId }: { clienteId: number }) => {
    const { data } = useExecuteQuery<LotesResponse>(['lotes', 'all', JSON.stringify(clienteId)], `/lotes/cliente/${clienteId}/all`, {
        params: { clienteId: clienteId },
    });

    return { lotes: data.lotes }
}
