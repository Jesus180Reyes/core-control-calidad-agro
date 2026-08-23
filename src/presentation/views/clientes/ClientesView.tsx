import { ClienteCard } from '#/presentation/components/clientes/ClienteCard'
import { ClientesVacio } from '#/presentation/components/clientes/ClientesVacio'
import { useClientes } from '#/presentation/hooks/clientes/useClientes'

/**
 * Consume el listado del backend, así que suspende: la ruta la monta dentro de
 * <Suspense> y <ErrorBoundary>.
 */
export function ClientesView() {
    const { clientes, seleccionarCliente } = useClientes()

    // Un operador sin clientes vinculados recibe 200 con la lista vacía, no un 404.
    if (clientes.length === 0) {
        return <ClientesVacio />
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
