import type { FiltrosUsuarios } from "#/presentation/schema/soporte/filtrosUsuariosSchema"
import type { CatalogUser, CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosUsuarios = (filtros: FiltrosUsuarios = {}) => {
    const { data } = useExecuteQuery<CatalogoResponse<CatalogUser>>(
        ['usuarios', filtros],
        '/catalogos/usuarios',
        { ...CATALOG_QUERY_OPTIONS, params: filtros },
    )

    return { usuarios: data.data }
}
