import { toDateParam } from '#/presentation/helpers/date/toDateParam'

export type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'custom'

export interface QualityMetricsFilters {
    preset: PeriodPreset
    desde?: Date          // sólo con preset 'custom'
    hasta?: Date          // sólo con preset 'custom'
    cliente_id?: number
    usuario_id?: number
}

export interface QualityMetricsParams {
    desde?: string
    hasta?: string
    cliente_id?: number
    usuario_id?: number
}

export const DEFAULT_QUALITY_METRICS_FILTERS: QualityMetricsFilters = { preset: '30d' }

// Días hacia atrás desde hoy, con hoy incluido: 7 días son hoy y los 6 anteriores.
const DIAS_ATRAS: Partial<Record<PeriodPreset, number>> = {
    '7d': 6,
    '90d': 89,
}

/**
 * Arma los query params de `GET /metricas/calidad`.
 *
 * Los presets nunca mandan `hasta`: lo completa el backend con su `CURDATE()`, y
 * así el rango termina en el "hoy" del mismo reloj (UTC) con el que se escribió
 * `created_at`. `30d` no manda fechas: es el default del backend.
 *
 * Sólo se agregan las claves definidas. `query-params.ts` manda los `''`, y el
 * endpoint responde 400 ante un valor vacío.
 */
export function buildQualityMetricsParams(
    filters: QualityMetricsFilters,
    today: Date = new Date(),
): QualityMetricsParams {
    const params: QualityMetricsParams = {}

    if (filters.preset === 'custom') {
        const desde = toDateParam(filters.desde)
        const hasta = toDateParam(filters.hasta)
        if (desde) params.desde = desde
        if (hasta) params.hasta = hasta
    } else if (filters.preset === 'month') {
        params.desde = toDateParam(new Date(today.getFullYear(), today.getMonth(), 1))
    } else {
        const dias = DIAS_ATRAS[filters.preset]
        if (dias !== undefined) {
            params.desde = toDateParam(
                new Date(today.getFullYear(), today.getMonth(), today.getDate() - dias),
            )
        }
    }

    if (filters.cliente_id !== undefined) params.cliente_id = filters.cliente_id
    if (filters.usuario_id !== undefined) params.usuario_id = filters.usuario_id

    return params
}
