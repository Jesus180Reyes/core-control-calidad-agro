import { toDateParam } from '#/presentation/helpers/date/toDateParam'
import type { FiltrosHistorial } from '#/presentation/schema/historial/filtrosHistorialSchema'
import type { PesajesResponse } from '#/presentation/types/pesajes/pesajesResponse'
import { useExecuteQuery } from '../shared/useExecuteQuery'

export function useHistorialPesajes(filtros: FiltrosHistorial) {
    const { desde, hasta, ...resto } = filtros

    const params = {
        ...resto,
        desde: toDateParam(desde),
        hasta: toDateParam(hasta),
    }

    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'historial', params],
        '/pesajes/historial',
        { params },
    )

    return { pesajes: data.pesajes }
}
