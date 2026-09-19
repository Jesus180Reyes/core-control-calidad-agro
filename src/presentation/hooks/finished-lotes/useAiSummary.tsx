import { useState } from 'react'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { FinishedLote, ResumenLoteResponse } from '#/presentation/types/lotes/lotes.types'

interface ResumenVariables {
    loteId: number
}

/**
 * Pide a la IA el resumen de un lote finalizado (`POST /lotes/{id}/resumen`) y
 * guarda cuál es el lote abierto: la pantalla monta un solo hook para todas las
 * cards y el diálogo se pinta una vez, con el lote que devuelve `lote`.
 *
 * No escribe toast de éxito a propósito: el resumen se lee en el diálogo, que
 * ya es el aviso de que salió bien. El de error sale solo (no hay `onError`).
 */
export function useAiSummary() {
    const [lote, setLote] = useState<FinishedLote | null>(null)

    const { mutate, data, isPending, isError, reset } = useExecuteMutation<
        ResumenLoteResponse,
        ResumenVariables
    >(({ loteId }) => `/lotes/${loteId}/resumen`)

    const generarResumen = (lote: FinishedLote) => {
        setLote(lote)
        mutate({ loteId: lote.id })
    }

    const reintentarResumen = () => {
        if (!lote) return
        mutate({ loteId: lote.id })
    }

    const cerrarResumen = () => {
        setLote(null)
        reset()
    }

    return {
        lote,
        resumen: data?.resumen ?? '',
        isPending,
        isError,
        generarResumen,
        reintentarResumen,
        cerrarResumen,
    }
}
