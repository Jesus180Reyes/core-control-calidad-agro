import { AiSummaryDialog } from '#/presentation/components/lotes/AiSummaryDialog'
import { FinishedLoteHighlightCard } from '#/presentation/components/lotes/FinishedLoteHighlightCard'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { useAiSummary } from '#/presentation/hooks/finished-lotes/useAiSummary'
import { useDownloadActa } from '#/presentation/hooks/finished-lotes/useDownloadActa'
import { useFinishedLotes } from '#/presentation/hooks/finished-lotes/useFinishedLotes'

interface FinishedLotesViewProps {
    clienteId: number
}

export function FinishedLotesView({ clienteId }: FinishedLotesViewProps) {
    const { lotes } = useFinishedLotes({ clienteId })
    const { descargarActa, loteDescargando } = useDownloadActa()
    const {
        lote: loteDelResumen,
        resumen,
        isPending: generandoResumen,
        isError: falloElResumen,
        generarResumen,
        reintentarResumen,
        cerrarResumen,
    } = useAiSummary()

    if (lotes.length === 0) {
        return (
            <EmptyState
                title="Este cliente no tiene lotes finalizados"
                description="Todavía no hay lotes aprobados y finalizados para este cliente."
            />
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lotes.map((lote) => (
                    <FinishedLoteHighlightCard
                        key={lote.id}
                        lote={lote}
                        onDownloadActa={descargarActa}
                        downloadingActa={loteDescargando === lote.id}
                        onAiSummary={generarResumen}
                        aiSummaryPending={
                            generandoResumen && loteDelResumen?.id === lote.id
                        }
                    />
                ))}
            </div>

            <AiSummaryDialog
                lote={loteDelResumen}
                resumen={resumen}
                isPending={generandoResumen}
                isError={falloElResumen}
                onRetry={reintentarResumen}
                onClose={cerrarResumen}
            />
        </>
    )
}
