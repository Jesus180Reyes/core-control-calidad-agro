import type { AgriSugerenciasResponse } from '#/presentation/types/agri/agri.types'
import { useExecuteQuery } from '../shared/useExecuteQuery'


export function useAgriSugerencias() {
    const { data } = useExecuteQuery<AgriSugerenciasResponse>(
        ['chat', 'sugerencias'],
        '/chat/sugerencias',
        { staleTime: Infinity },
    )

    return { sugerencias: data.sugerencias }
}
