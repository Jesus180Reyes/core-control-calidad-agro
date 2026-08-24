
export interface Lote {
    id: number
    nombre_lote: string
    variedad_o_talla: string | null
    producto: string
    unidad_medida: string
    peso_minimo: string
    peso_ideal: string
    peso_maximo: string
    estado: string
}

export interface LotesResponse {
    ok: boolean
    msg: string
    lotes: Lote[]
}


declare module '@tanstack/react-router' {
    interface HistoryState {
        lote?: Lote
    }
}
