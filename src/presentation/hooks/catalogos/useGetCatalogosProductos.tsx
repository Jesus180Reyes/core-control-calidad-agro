import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"

export const useGetCatalogosProductos = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['productos'], '/catalogos/productos')

    return { productos: data.data }
}
