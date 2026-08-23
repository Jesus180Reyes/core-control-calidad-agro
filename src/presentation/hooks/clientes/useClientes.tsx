import { useNavigate } from '@tanstack/react-router'

import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { Cliente, ClientesResponse } from '#/presentation/types/clientes/clientes.types'


export function useClientes() {
    const navigate = useNavigate()

    const { data } = useExecuteQuery<ClientesResponse>(['clientes'], '/clientes')

    const seleccionarCliente = (cliente: Cliente) => {
        navigate({ to: '/control-calidad', state: { cliente } })
    }

    return { clientes: data.clientes, seleccionarCliente }
}
