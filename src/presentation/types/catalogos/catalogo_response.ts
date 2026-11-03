
export interface CatalogoResponse<TData = CatalogoData> {
    ok: boolean
    msg: string
    data: TData[],
}

export interface CatalogoData {
    id: number
    nombre: string
}

export interface CatalogUser extends CatalogoData {
    cedula: string | null
    rol: string
}

