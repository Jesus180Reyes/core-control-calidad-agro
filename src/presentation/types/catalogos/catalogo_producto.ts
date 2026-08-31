
export interface CatalogoResponse {
    ok: boolean
    msg: string
    data: CatalogoData[],
}

export interface CatalogoData {
    id: number
    nombre: string
}

