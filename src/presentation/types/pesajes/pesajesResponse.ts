
export interface PesajesResponse {
    ok: boolean;
    msg: string;
    pesajes: PesajeData[];
}

export interface PesajeData {
    id: number;
    lote_id: number;
    nombre_lote: string;
    peso_bruto: string;
    tara: string;
    peso_neto: string;
    fuera_de_rango: number;
    estado_calidad_codigo: string;
    estado_calidad: string;
    usuario: string;
    dispositivo_identificador: null;
    secuencia_dispositivo: null;
    created_at: Date;
    unidad_medida: string;
}


