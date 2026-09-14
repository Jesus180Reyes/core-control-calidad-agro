export interface DetalleDocumentoFiscalResponse {
    ok: boolean;
    msg: string;
    documento: DocumentoFiscalData;
}

export interface DocumentoFiscalData {
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
    // Llegaron en null en la respuesta de muestra, pero el backend los emite
    // cuando el documento los tiene: van como `| null` para no tener que
    // castear en cada celda que los pinta.
    referencia_exencion: string | null;
    pais_destino: string | null;
    documento_aduanero: string | null;
    archivo_url: string | null;
    cliente_id: number;
    cliente: string;
    cliente_rtn: string;
    /** 1 vigente, 0 anulado: el backend manda el flag como número, no como boolean. */
    isActive: number;
    // Los tres sólo vienen con valor en un documento anulado.
    motivo_anulacion: string | null;
    anulado_por: string | null;
    anulado_en: Date | null;
    created_at: Date;
    pais: PaisDocumentoFiscal;
    impuestos: ImpuestoDocumentoFiscal[];
    lotes: LoteDocumentoFiscal[];
}

export interface ImpuestoDocumentoFiscal {
    tarifa: string;
    base_gravada: string;
    impuesto: string;
}

export interface LoteDocumentoFiscal {
    lote_id: number;
    cantidad: string;
    unidad_medida_facturada: string | null;
    nombre_lote: string;
    variedad_o_talla: string;
    producto: string;
    unidad_medida: string;
    aprobado_por: string;
    aprobado_en: Date;
    finalizado_por: string;
    finalizado_en: Date;
    pesajes_activos: number;
    peso_neto_total: number;
}

export interface PaisDocumentoFiscal {
    codigo_pais: string;
    etiqueta_autorizacion: string;
    etiqueta_identificacion: string;
}
