import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosUsuarios = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['usuarios'], '/catalogos/usuarios', CATALOG_QUERY_OPTIONS)

    return { usuarios: data.data }
}
