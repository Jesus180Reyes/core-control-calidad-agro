import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { ClientesResponse } from '#/presentation/types/clientes/clientes.types'

export function useClientInspection() {
    const { data } = useExecuteQuery<ClientesResponse>(['clientes', 'all'], '/clientes/all')

    return { clientes: data.clientes }
}
