// Contrato de GET /metricas/calidad (SPEC 35 del backend). Los porcentajes y
// desviaciones llegan ya calculados, con 2 decimales, y en null sin datos:
// el front formatea pero no divide.

export interface QualityIndicators {
    total_pesajes: number
    fuera_de_rango: number
    porcentaje_fuera_de_rango: number | null
    // Con signo: positiva es por encima del ideal, negativa por debajo.
    desviacion_promedio_pct: number | null
    desviacion_estandar_pct: number | null
    aprobados_por_aprobador: number
    rechazados_por_aprobador: number
    // No es la cola del aprobador: incluye lotes que no llegaron a CLIENTE_FINAL.
    sin_revisar: number
    porcentaje_rechazo_aprobador: number | null
    anulados: number
    porcentaje_anulacion: number | null
}

export interface QualityStateMetric {
    estado_calidad_id: number
    codigo: string
    nombre: string
    total: number
    porcentaje: number | null
}

export interface ClientQualityMetrics extends QualityIndicators {
    cliente_id: number
    cliente: string | null
}

export interface QualityMetrics {
    periodo: { desde: string; hasta: string }
    filtros: { cliente_id: number | null; usuario_id: number | null }
    resumen: QualityIndicators
    // Trae todas las filas del catálogo, también las de total 0, ordenadas por id.
    por_estado_calidad: QualityStateMetric[]
    // Ordenado por total_pesajes DESC.
    por_cliente: ClientQualityMetrics[]
}

export interface QualityMetricsResponse {
    ok: boolean
    msg: string
    metricas: QualityMetrics
}
