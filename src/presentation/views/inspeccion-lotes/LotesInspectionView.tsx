import { useNavigate } from '@tanstack/react-router'

import { LoteCard } from '#/presentation/components/lotes/LoteCard'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { useInspeccionLotes } from '#/presentation/hooks/inspeccion-lotes/useInspeccionLotes'

interface LotesInspectionViewProps {
    clienteId: number
}

export function LotesInspectionView({ clienteId }: LotesInspectionViewProps) {
    const { lotes } = useInspeccionLotes({ clienteId })
    const navigate = useNavigate()

    if (lotes.length === 0) {
        return (
            <EmptyState
                title="Este cliente no tiene lotes"
                description="Todavía no hay lotes registrados para este cliente."
            />
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lotes.map((lote) => (
                <LoteCard
                    key={lote.id}
                    lote={lote}
                    onSeleccionar={(item) =>
                        navigate({
                            to: '/inspeccion-pesajes-by-lote',
                            search: { loteId: item.id },
                            state: { lote: item },
                        })
                    }
                />
            ))}
        </div>
    )
}
