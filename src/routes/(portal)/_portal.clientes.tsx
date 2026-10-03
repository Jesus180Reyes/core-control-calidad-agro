import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { WeighingStepper } from '#/presentation/components/control-calidad/WeighingStepper'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ClientesView } from '#/presentation/views/clientes/ClientesView'

export const Route = createFileRoute('/(portal)/_portal/clientes')({
    component: ClientesPage,
})

function ClientesPage() {
    return (
        <div className="space-y-8">
            <WeighingStepper current="cliente" />

            <ClientesHeader
                titulo="Seleccioná un cliente"
                descripcion="Elegí para quién vas a pesar. Después de eso se abre la báscula."
            />

            <Suspense fallback={<LoadingState />}>
                <ClientesView />
            </Suspense>
        </div>
    )
}
