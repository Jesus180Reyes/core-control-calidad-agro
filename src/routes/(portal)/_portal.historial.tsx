import { Suspense, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { HistorialFiltersBar } from '#/presentation/views/historial/HistorialFiltersBar'
import { HistorialPesajesTable } from '#/presentation/views/historial/HistorialPesajesTable'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import type { FiltrosHistorial } from '#/presentation/schema/historial/filtrosHistorialSchema'

export const Route = createFileRoute('/(portal)/_portal/historial')({
  component: HistorialPage,
})

function HistorialPage() {
  const [filtros, setFiltros] = useState<FiltrosHistorial>({})

  return (
    <div className="space-y-8">
      <ClientesHeader
        titulo="Historial de Pesajes"
        descripcion="Todos tus pesajes registrados."
      />

      <HistorialFiltersBar filtros={filtros} onApply={setFiltros} />

      <Suspense fallback={<LoadingState label="Cargando historial de pesajes..." />}>
        <HistorialPesajesTable filtros={filtros} />
      </Suspense>
    </div>
  )
}
