import { useExecuteQuery } from "#/presentation/hooks/shared/useExecuteQuery"
import type { OperadoresClienteResponse } from "#/presentation/types/clientes/clientes.types"

// Sin CATALOG_QUERY_OPTIONS: no es un catálogo y tiene que reflejar el último guardado.
export function useGetOperadoresCliente({ clienteId }: { clienteId: number }) {
    const { data } = useExecuteQuery<OperadoresClienteResponse>(
        ['clientes', clienteId, 'operadores'],
        `/clientes/${clienteId}/operadores`,
    )

    return { operadoresVinculados: data.operadores }
}
