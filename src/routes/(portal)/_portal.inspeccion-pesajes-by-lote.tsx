import { Suspense } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoteCard } from '#/presentation/components/lotes/LoteCard'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { PesajesInspectionView } from '#/presentation/views/inspeccion-pesajes/PesajesInspectionView'

export const Route = createFileRoute(
    '/(portal)/_portal/inspeccion-pesajes-by-lote',
)({
    validateSearch: (search: Record<string, unknown>) => ({
        loteId: Number(search.loteId),
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.loteId)) {
            throw redirect({ to: '/inspeccion-clientes' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { loteId } = Route.useSearch()
    const lote = useLocation({ select: (location) => location.state.lote })

    return (
        <div className="space-y-8">
            <ClientesHeader
                backTo="/inspeccion-clientes"
                titulo="Pesajes registrados"
                descripcion={`Todos los pesajes del lote ${lote?.nombre_lote}.`
                }
            />

            {lote && (
                <div className="max-w-md">
                    <LoteCard lote={lote} />
                </div>
            )}

            <Suspense fallback={<LoadingState label="Cargando pesajes..." />}>
                <PesajesInspectionView loteId={loteId} />
            </Suspense>
        </div>
    )
}
