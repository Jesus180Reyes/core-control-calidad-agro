export interface DocumentosFiscalesResponse {
    ok: boolean;
    msg: string;
    documentos: Documento[];
}

export interface Documento {
    id: number;
    tipo_documento: string;
    numero_completo: string;
    autorizacion: string;
    fecha_emision: Date;
    moneda: string;
    tipo_cambio: string;
    importe_exento: string;
    importe_exonerado: string;
    total: string;
    referencia_exencion: null;
    pais_destino: null;
    documento_aduanero: null;
    archivo_url: null;
    cliente_id: number;
    cliente: string;
    cliente_rtn: string;
    pais: string;
    created_at: Date;
}
