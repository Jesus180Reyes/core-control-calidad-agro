import type { CatalogoResponse } from "#/presentation/types/catalogos/catalogo_response"
import { useExecuteQuery } from "../shared/useExecuteQuery"

export const useGetCatalogosUnidadMedida = () => {
    const { data } = useExecuteQuery<CatalogoResponse>(['unidades-medidas'], '/catalogos/unidades-medida')

    return { unidadesMedidas: data.data }
}
