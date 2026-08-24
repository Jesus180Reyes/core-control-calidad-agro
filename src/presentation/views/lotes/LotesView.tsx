import { LoteCard } from '#/presentation/components/lotes/LoteCard'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { useLotes } from '#/presentation/hooks/lotes/useLotes'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

interface LotesViewProps {
    cliente: Cliente
}

export function LotesView({ cliente }: LotesViewProps) {
    const { lotes, seleccionarLote } = useLotes(cliente)

    if (lotes.length === 0) {
        return (
            <EmptyState
                title="Este cliente no tiene lotes"
                description={`Todavía no hay lotes cargados para ${cliente.nombre}. Pedí a un supervisor que cree uno.`}
            />
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lotes.map((lote) => (
                <LoteCard
                    key={lote.id}
                    lote={lote}
                    onSeleccionar={seleccionarLote}
                />
            ))}
        </div>
    )
}
