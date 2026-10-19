import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosOrigenes = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['origenes'], '/catalogos/origenes', CATALOG_QUERY_OPTIONS)

    return { origenes: data.data }
}
