import { Suspense, useState, useTransition } from 'react'
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
  const [pagina, setPagina] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Filtrar vuelve a la página 1 y sigue suspendiendo con el LoadingState, como antes.
  const aplicarFiltros = (nuevos: FiltrosHistorial) => {
    setFiltros(nuevos)
    setPagina(1)
  }

  // En transición: la tabla anterior queda en pantalla mientras llega la página nueva.
  const cambiarPagina = (nueva: number) => startTransition(() => setPagina(nueva))

  return (
    <div className="space-y-8">
      <ClientesHeader
        titulo="Historial de Pesajes"
        descripcion="Todos tus pesajes registrados."
      />

      <HistorialFiltersBar filtros={filtros} onApply={aplicarFiltros} />

      <Suspense fallback={<LoadingState />}>
        <HistorialPesajesTable
          filtros={filtros}
          pagina={pagina}
          onPageChange={cambiarPagina}
          isPending={isPending}
        />
      </Suspense>
    </div>
  )
}
