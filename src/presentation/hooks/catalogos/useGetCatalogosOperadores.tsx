import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosOperadores = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['operadores'], '/catalogos/operadores', CATALOG_QUERY_OPTIONS)

    return { operadores: data.data }
}
