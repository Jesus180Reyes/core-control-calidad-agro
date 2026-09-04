import type { PesajesResponse } from '#/presentation/types/pesajes/pesajesResponse'
import { useExecuteQuery } from '../shared/useExecuteQuery'

export function useHistorialPesajes() {
    const { data } = useExecuteQuery<PesajesResponse>(
        ['pesajes', 'historial'],
        '/pesajes/historial',
    )

    return { pesajes: data.pesajes }
}
