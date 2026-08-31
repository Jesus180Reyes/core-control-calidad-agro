import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"

export const useGetCatalogosUsuarios = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['usuarios'], '/catalogos/usuarios')

    return { usuarios: data.data }
}
