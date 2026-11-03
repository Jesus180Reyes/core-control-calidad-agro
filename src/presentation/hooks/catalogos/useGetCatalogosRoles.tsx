import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosRoles = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['roles'], '/catalogos/roles', CATALOG_QUERY_OPTIONS)

    return { roles: data.data }
}
