
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

/**
 * Un lote que ya cerró su ciclo: además de los datos del lote trae la traza de
 * quién lo aprobó y quién lo finalizó. Los cuatro campos de la traza se tipan
 * anulables porque el backend los llena en dos momentos distintos.
 */
export interface FinishedLote extends Lote {
    etapa: string
    aprobado_por: string | null
    aprobado_en: string | null
    finalizado_por: string | null
    finalizado_en: string | null
}

export interface FinishedLotesResponse {
    ok: boolean
    msg: string
    lotes: FinishedLote[]
}


declare module '@tanstack/react-router' {
    interface HistoryState {
        lote?: Lote
    }
}
