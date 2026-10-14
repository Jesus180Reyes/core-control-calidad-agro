import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosProductos = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['productos'], '/catalogos/productos', CATALOG_QUERY_OPTIONS)

    return { productos: data.data }
}
