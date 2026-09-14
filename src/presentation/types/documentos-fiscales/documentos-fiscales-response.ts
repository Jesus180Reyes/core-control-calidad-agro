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
    // Los cuatro llegaron en null en la respuesta de muestra, pero el backend
    // los emite cuando el documento los tiene: van como `string | null` para no
    // tener que castear en cada celda que los pinta.
    referencia_exencion: string | null;
    pais_destino: string | null;
    documento_aduanero: string | null;
    archivo_url: string | null;
    cliente_id: number;
    cliente: string;
    cliente_rtn: string;
    pais: string;
    created_at: Date;
}
