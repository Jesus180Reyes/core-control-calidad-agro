import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { FiltrosClientes } from '#/presentation/schema/inspeccion-clientes/filtrosClientesSchema'
import type { ClientesResponse } from '#/presentation/types/clientes/clientes.types'
import { TAMANO_PAGINA } from '#/presentation/types/shared/paginacion.types'

/**
 * Sin `pagina` pide la lista completa: es lo que usan los selectores de cliente
 * (`HistorialFiltersBar`, `DocumentosFiscalesFiltersBar`, `CreateDocumentoFiscalForm`).
 * No pasarles una página: mostrarían 20 clientes sin avisar.
 */
export function useClientInspection(filtros: FiltrosClientes = {}, pagina?: number) {
    const params = pagina === undefined
        ? filtros
        : { ...filtros, pagina, limite: TAMANO_PAGINA }

    const { data } = useExecuteQuery<ClientesResponse>(
        ['clientes', 'all', params],
        '/clientes/all',
        { params },
    )

    return { clientes: data.clientes, paginacion: data.paginacion }
}
