import { ClienteCard } from '#/presentation/components/clientes/ClienteCard'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface ClientesViewProps {
    clientes: Cliente[]
    onSeleccionar: (cliente: Cliente) => void
}

export function ClientesView({ clientes, onSeleccionar }: ClientesViewProps) {
    return (
        <div className="space-y-8">
            <header className="space-y-1">
                <span className="text-xs font-bold tracking-widest text-text-muted uppercase">
                    Paso 1 de 2
                </span>
                <h1 className="text-2xl font-black tracking-tight text-text-main">
                    Seleccioná un cliente
                </h1>
                <p className="text-sm text-text-muted">
                    Elegí para quién vas a pesar. Después de eso se abre la báscula.
                </p>
            </header>

            {clientes.length === 0 ? (
                <div className="border border-dashed border-border-ui rounded-[28px] p-12 text-center space-y-2">
                    <p className="text-text-main font-bold">
                        No hay clientes asignados
                    </p>
                    <p className="text-sm text-text-muted">
                        Pedí a un supervisor que te vincule al menos un cliente para poder pesar.
                    </p>
                </div>
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
