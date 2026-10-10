import { Suspense, useCallback, useState, useTransition } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import {
  DEFAULT_QUALITY_METRICS_FILTERS,
  type QualityMetricsFilters,
} from '#/presentation/hooks/metricas/qualityMetricsParams'
import { MetricsFilterBar } from '#/presentation/views/metricas/MetricsFilterBar'
import { QualityMetricsDashboard } from '#/presentation/views/metricas/QualityMetricsDashboard'

export const Route = createFileRoute('/(portal)/_portal/metricas')({
  component: MetricasPage,
})

function MetricasPage() {
  const [barFilters, setBarFilters] = useState<QualityMetricsFilters>(DEFAULT_QUALITY_METRICS_FILTERS)
  const [filters, setFilters] = useState<QualityMetricsFilters>(DEFAULT_QUALITY_METRICS_FILTERS)
  const [isPending, startTransition] = useTransition()

  const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

  const applyFilters = useCallback((nuevos: QualityMetricsFilters) => {
    setBarFilters(nuevos)
    startTransition(() => setFilters(nuevos))
  }, [])

  const selectClient = (clienteId: number) => applyFilters({ ...barFilters, cliente_id: clienteId })

  const renderFilterBar = (onChange: (nuevos: QualityMetricsFilters) => void) => (
    <Suspense fallback={null}>
      <MetricsFilterBar filters={barFilters} onChange={onChange} />
    </Suspense>
  )

  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        const retry = () => {
          limpiarErrorDeQuery()
          reset()
        }

        return (
          <div className="space-y-5">
            <ClientesHeader titulo="Métricas de calidad" />

            {renderFilterBar((nuevos) => {
              applyFilters(nuevos)
              retry()
            })}

            <div className="space-y-4 rounded-[28px] border border-dashed border-border-ui p-12 text-center">
              <p className="font-bold text-text-main">No se pudieron cargar las métricas</p>
              <p className="text-sm text-text-muted">{error.message}</p>
              <Button type="button" variant="outline" onClick={retry}>
                Reintentar
              </Button>
            </div>
          </div>
        )
      }}
    >
      <Suspense fallback={<LoadingState />}>
        <QualityMetricsDashboard
          filters={filters}
          filterBar={renderFilterBar(applyFilters)}
          isPending={isPending}
          onClientSelect={selectClient}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
