import { Suspense } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { Download } from 'lucide-react'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
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
                    <CustomButton
                        fullWidth={false}
                        icon={<Download className="size-4" />}
                    >
                        Descargar Reporte de lotes finalizados.
                    </CustomButton>
                }
                descripcion={
                    cliente
                        ? `Lotes de ${cliente.nombre} que ya fueron aprobados y finalizados.`
                        : 'Lotes del cliente que ya fueron aprobados y finalizados.'
                }
            />

            <Suspense fallback={<LoadingState label="Cargando lotes finalizados..." />}>
                <FinishedLotesView clienteId={clienteId} />
            </Suspense>
        </div>
    )
}
