import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { FiltrosClientes } from '#/presentation/schema/inspeccion-clientes/filtrosClientesSchema'
import type { ClientesResponse } from '#/presentation/types/clientes/clientes.types'

export function useClientInspection(filtros: FiltrosClientes = {}) {
    const { data } = useExecuteQuery<ClientesResponse>(
        ['clientes', 'all', filtros],
        '/clientes/all',
        { params: filtros },
    )

    return { clientes: data.clientes }
}
