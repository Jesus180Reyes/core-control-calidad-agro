import { Suspense } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { LotesInspectionView } from '#/presentation/views/inspeccion-lotes/LotesInspectionView'

export const Route = createFileRoute(
    '/(portal)/_portal/inspeccion-lotes-by-cliente',
)({
    validateSearch: (search: Record<string, unknown>) => ({
        clienteId: Number(search.clienteId),
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.clienteId)) {
            throw redirect({ to: '/inspeccion-clientes' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { clienteId } = Route.useSearch()
    const cliente = useLocation({ select: (location) => location.state.cliente })

    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Lotes registrados"
                descripcion={
                    cliente
                        ? `Todos los lotes de ${cliente.nombre}, activos e inactivos.`
                        : 'Todos los lotes del cliente, activos e inactivos.'
                }
            />

            <Suspense fallback={<LoadingState label="Cargando lotes..." />}>
                <LotesInspectionView clienteId={clienteId} />
            </Suspense>
        </div>
    )
}
