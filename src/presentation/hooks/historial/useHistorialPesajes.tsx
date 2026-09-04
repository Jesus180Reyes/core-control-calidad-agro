import type { FiltrosHistorial } from '#/presentation/schema/historial/filtrosHistorialSchema'
import type { PesajesResponse } from '#/presentation/types/pesajes/pesajesResponse'
import { useExecuteQuery } from '../shared/useExecuteQuery'

export function useHistorialPesajes(filtros: FiltrosHistorial) {
    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'historial', filtros],
        '/pesajes/historial',
        { params: filtros },
    )

    return { pesajes: data.pesajes }
}
