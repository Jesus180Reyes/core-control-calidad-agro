import { useNavigate } from '@tanstack/react-router'

import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'
import type { Lote, LotesResponse } from '#/presentation/types/lotes/lotes.types'


export function useLotes(cliente: Cliente) {
    const navigate = useNavigate()

    const { data } = useExecuteQuery<LotesResponse>(
        ['lotes', 'cliente', cliente.id],
        `/lotes/cliente/${cliente.id}`,
    )


    const seleccionarLote = (lote: Lote) => {
        navigate({ to: '/control-calidad', state: { cliente, lote } })
    }

    return { lotes: data.lotes, seleccionarLote }
}
