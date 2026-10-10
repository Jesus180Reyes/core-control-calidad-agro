
export interface CrearPesajeBody {
    lote_id: number
    peso_bruto: number
    tara?: number
    /** SPEC 38 del backend. Se omite si no hubo PIN. */
    autorizacion_token?: string
}

export interface ValidarPinBody {
    pin: string
}

export interface AutorizacionSupervisor {
    /** UUID de un solo uso; se consume solo si el neto supera el máximo. */
    token: string
    /** `complete_name` del supervisor, para mostrarlo en la tara. */
    supervisor: string
}

export interface ValidarPinResponse {
    ok: boolean
    msg: string
    autorizacion: AutorizacionSupervisor
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
