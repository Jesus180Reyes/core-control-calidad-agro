import { FinishedLoteCard } from '#/presentation/components/lotes/FinishedLoteCard'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { useFinishedLotes } from '#/presentation/hooks/finished-lotes/useFinishedLotes'

interface FinishedLotesViewProps {
    clienteId: number
}

export function FinishedLotesView({ clienteId }: FinishedLotesViewProps) {
    const { lotes } = useFinishedLotes({ clienteId })

    if (lotes.length === 0) {
        return (
            <EmptyState
                title="Este cliente no tiene lotes finalizados"
                description="Todavía no hay lotes aprobados y finalizados para este cliente."
            />
        )
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lotes.map((lote) => (
                <FinishedLoteCard key={lote.id} lote={lote} />
            ))}
        </div>
    )
}
