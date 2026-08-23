import { ClienteCard } from '#/presentation/components/clientes/ClienteCard'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { useClientes } from '#/presentation/hooks/clientes/useClientes'

export function ClientesView() {
    const { clientes, seleccionarCliente } = useClientes()

    if (clientes.length === 0) {
        return (
            <EmptyState
                title="No hay clientes asignados"
                description="Pedí a un supervisor que te vincule al menos un cliente para poder pesar."
            />
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((cliente) => (
                <ClienteCard
                    key={cliente.id}
                    cliente={cliente}
                    onSeleccionar={seleccionarCliente}
                />
            ))}
        </div>
    )
}
