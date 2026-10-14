import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosEstadosCalidad = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['estados-calidad'], '/catalogos/estados-calidad', CATALOG_QUERY_OPTIONS)

    return { estadosCalidad: data.data }
}
