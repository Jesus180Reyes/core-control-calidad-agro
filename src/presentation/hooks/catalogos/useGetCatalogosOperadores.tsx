import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"

export const useGetCatalogosOperadores = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['operadores'], '/catalogos/operadores')

    return { operadores: data.data }
}
