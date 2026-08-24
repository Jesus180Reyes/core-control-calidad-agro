
export interface CrearPesajeBody {
    lote_id: number
    estado_calidad_id: number
    peso_bruto: number
    /** Opcional en el API; este spec nunca la manda. */
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
