import { Suspense } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { FinishedLotesReportButton } from '#/presentation/components/lotes/FinishedLotesReportButton'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { FinishedLotesView } from '#/presentation/views/finished-lotes/FinishedLotesView'

export const Route = createFileRoute('/(portal)/_portal/clientes-finalizados')({
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
                backTo="/inspeccion-clientes"
                titulo="Lotes finalizados"
                actions={
                    <FinishedLotesReportButton
                        clienteId={clienteId}
                        nombreCliente={cliente?.nombre}

                    />
                }
                descripcion={
                    cliente
                        ? `Lotes de ${cliente.nombre} que ya fueron aprobados y finalizados.`
                        : 'Lotes del cliente que ya fueron aprobados y finalizados.'
                }
            />

            <Suspense fallback={<LoadingState />}>
                <FinishedLotesView clienteId={clienteId} />
            </Suspense>
        </div>
    )
}
