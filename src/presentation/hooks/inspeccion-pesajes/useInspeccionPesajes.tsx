import type { PesajesResponse } from "#/presentation/types/pesajes/pesajesResponse"
import { useExecuteQuery } from "../shared/useExecuteQuery"

export const useGetInspeccionPesajes = ({ loteId }: { loteId: number }) => {
    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'byLote', loteId],
        `/pesajes/byLote/${loteId}`,
    )
    return { pesajes: data.pesajes }
}
