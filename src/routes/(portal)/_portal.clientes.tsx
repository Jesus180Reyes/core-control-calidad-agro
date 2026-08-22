import { createFileRoute } from '@tanstack/react-router'

import { useClientes } from '#/presentation/hooks/clientes/useClientes'
import { ClientesView } from '#/presentation/views/clientes/ClientesView'

export const Route = createFileRoute('/(portal)/_portal/clientes')({
    component: ClientesPage,
})

function ClientesPage() {
    const { clientes, seleccionarCliente } = useClientes()

    return <ClientesView clientes={clientes} onSeleccionar={seleccionarCliente} />
}
