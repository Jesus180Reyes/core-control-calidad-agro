import { ClienteCard } from '#/presentation/components/clientes/ClienteCard'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { ClientesVacio } from '#/presentation/components/clientes/ClientesVacio'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface ClientesViewProps {
    clientes: Cliente[]
    onSeleccionar: (cliente: Cliente) => void
}

export function ClientesView({ clientes, onSeleccionar }: ClientesViewProps) {
    const sinClientes = clientes.length === 0

    return (
        <div className="space-y-8">
            <ClientesHeader
                paso="Paso 1 de 2"
                titulo="Seleccioná un cliente"
                descripcion="Elegí para quién vas a pesar. Después de eso se abre la báscula."
            />

            {sinClientes ? (
                <ClientesVacio />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clientes.map((cliente) => (
                        <ClienteCard
                            key={cliente.id}
                            cliente={cliente}
                            onSeleccionar={onSeleccionar}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
