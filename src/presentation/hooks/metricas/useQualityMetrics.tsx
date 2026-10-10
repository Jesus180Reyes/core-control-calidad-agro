import type { QualityMetrics, QualityMetricsResponse } from '#/presentation/types/metricas/qualityMetrics.types'
import { useExecuteQuery } from '../shared/useExecuteQuery'
import { buildQualityMetricsParams } from './qualityMetricsParams'
import type { QualityMetricsFilters } from './qualityMetricsParams'

/**
 * Métricas de calidad del período. Suspende: quien lo use va dentro de
 * `<Suspense>` y del `ErrorBoundary`. Sin `staleTime` propio, así que volver a
 * un filtro ya visitado sale de la caché con la política por defecto.
 */
export function useQualityMetrics(filters: QualityMetricsFilters): QualityMetrics {
    const params = buildQualityMetricsParams(filters)

    const { data } = useExecuteQuery<QualityMetricsResponse>(
        ['metricas', 'calidad', params],
        '/metricas/calidad',
        { params },
    )

    return data.metricas
}
