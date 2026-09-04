import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { HistorialPesajesTable } from '#/presentation/views/historial/HistorialPesajesTable'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'

export const Route = createFileRoute('/(portal)/_portal/historial')({
  component: HIstorialPage,
})

function HIstorialPage() {
  return (
    <div className="space-y-8">
      <ClientesHeader
        titulo="Historial de Pesajes"
        descripcion="Todos tus pesajes registrados."
      />

      <Suspense fallback={<LoadingState label="Cargando historial de pasajes..." />}>
        <HistorialPesajesTable />
      </Suspense>
    </div>
  )
}
