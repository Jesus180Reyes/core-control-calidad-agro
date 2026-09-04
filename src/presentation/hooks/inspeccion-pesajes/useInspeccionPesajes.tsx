import { toDateParam } from "#/presentation/helpers/date/toDateParam"
import type { FiltrosPesajes } from "#/presentation/schema/inspeccion-pesajes/filtrosPesajesSchema"
import type { PesajesResponse } from "#/presentation/types/pesajes/pesajesResponse"
import { useExecuteQuery } from "../shared/useExecuteQuery"

interface UseGetInspeccionPesajesParams {
    loteId: number
    filtros?: FiltrosPesajes
}

export const useGetInspeccionPesajes = ({ loteId, filtros = {} }: UseGetInspeccionPesajesParams) => {
    const { desde, hasta, ...resto } = filtros

    const params = {
        ...resto,
        desde: toDateParam(desde),
        hasta: toDateParam(hasta),
    }

    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'byLote', loteId, params],
        `/pesajes/byLote/${loteId}`,
        { params },
    )
    return { pesajes: data.pesajes }
}
