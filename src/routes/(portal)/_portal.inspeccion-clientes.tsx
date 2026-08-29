import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ClientInspectionView } from '#/presentation/views/inspeccion-clientes/ClientInspectionView'

export const Route = createFileRoute('/(portal)/_portal/inspeccion-clientes')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Inspección de clientes"
                descripcion="Revisá los datos de cada cliente antes de habilitarlo para pesar."
            />

            <Suspense fallback={<LoadingState label="Cargando clientes..." />}>
                <ClientInspectionView />
            </Suspense>
        </div>
    )
}
