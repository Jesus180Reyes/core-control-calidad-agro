import type { FiltrosHistorial } from '#/presentation/schema/historial/filtrosHistorialSchema'
import type { PesajesResponse } from '#/presentation/types/pesajes/pesajesResponse'
import { useExecuteQuery } from '../shared/useExecuteQuery'


function toDateParam(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')

    return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function useHistorialPesajes(filtros: FiltrosHistorial) {
    const { desde, hasta, ...resto } = filtros

    const params = {
        ...resto,
        desde: desde && toDateParam(desde),
        hasta: hasta && toDateParam(hasta),
    }

    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'historial', params],
        '/pesajes/historial',
        { params },
    )

    return { pesajes: data.pesajes }
}
