import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense, useEffect } from 'react'

import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { useLotWeighings } from '#/presentation/hooks/mirador/useLotWeighings'
import type { PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

interface LotWeighingsLoaderProps {
    lotId: number
    onLoad: (lotId: number, weighings: PlantWeighing[]) => void
}

/**
 * Pide los pesajes del lote seleccionado y se los pasa a la vista, que los
 * reparte entre el panel y la diana de la escena. No pinta nada salvo mientras
 * carga o si falla.
 *
 * El `<Suspense>` y el `ErrorBoundary` son de acá y no de la ruta a propósito:
 * suspender el tablero desmontaría la escena 3D cada vez que se elige un lote.
 */
export function LotWeighingsLoader({ lotId, onLoad }: LotWeighingsLoaderProps) {
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    return (
        <ErrorBoundary
            key={lotId}
            fallback={(_error, reset) => (
                <div className="space-y-2 py-6 text-center">
                    <p className="text-[12.5px] text-text-muted">No se pudieron cargar los pesajes del lote.</p>
                    <button
                        type="button"
                        onClick={() => {
                            limpiarErrorDeQuery()
                            reset()
                        }}
                        className="cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-bold text-text-main underline underline-offset-4 hover:text-brand"
                    >
                        Reintentar
                    </button>
                </div>
            )}
        >
            <Suspense fallback={<LoadingState size="sm" className="py-10" />}>
                <Weighings lotId={lotId} onLoad={onLoad} />
            </Suspense>
        </ErrorBoundary>
    )
}

function Weighings({ lotId, onLoad }: LotWeighingsLoaderProps) {
    const weighings = useLotWeighings(lotId)
    useEffect(() => onLoad(lotId, weighings), [lotId, weighings, onLoad])
    return null
}
