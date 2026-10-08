import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { CollaboratorsView } from '#/presentation/views/colaboradores/CollaboratorsView'

export const Route = createFileRoute('/(portal)/_portal/colaboradores')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Colaboradores"
                descripcion="Todos los usuarios creados en el sistema."
            />

            <Suspense fallback={<LoadingState />}>
                <CollaboratorsView />
            </Suspense>
        </div>
    )
}
