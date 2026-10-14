import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"
import { CATALOG_QUERY_OPTIONS } from "./catalogQueryOptions"

export const useGetCatalogosUnidadMedida = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['unidades-medidas'], '/catalogos/unidades-medida', CATALOG_QUERY_OPTIONS)

    return { unidadesMedidas: data.data }
}
