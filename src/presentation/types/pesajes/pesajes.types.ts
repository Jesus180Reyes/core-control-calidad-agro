
export interface CrearPesajeBody {
    lote_id: number
    peso_bruto: number
    tara?: number
}

export interface PesajeCreado {
    id: number
    peso_neto: number
    fuera_de_rango: boolean
}

export interface CrearPesajeResponse {
    ok: boolean
    msg: string
    pesaje: PesajeCreado
}
