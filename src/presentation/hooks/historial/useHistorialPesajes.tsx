import { toDateParam } from '#/presentation/helpers/date/toDateParam'
import type { FiltrosHistorial } from '#/presentation/schema/historial/filtrosHistorialSchema'
import type { PesajesResponse } from '#/presentation/types/pesajes/pesajesResponse'
import { TAMANO_PAGINA } from '#/presentation/types/shared/paginacion.types'
import { useExecuteQuery } from '../shared/useExecuteQuery'

export function useHistorialPesajes(filtros: FiltrosHistorial, pagina: number) {
    const { desde, hasta, ...resto } = filtros

    // `limite` viaja explícito: el tamaño de página lo decide el front, no el default del backend.
    const params = {
        ...resto,
        desde: toDateParam(desde),
        hasta: toDateParam(hasta),
        pagina,
        limite: TAMANO_PAGINA,
    }

    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'historial', params],
        '/pesajes/historial',
        { params },
    )

    return { pesajes: data.pesajes, paginacion: data.paginacion }
}
