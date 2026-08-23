import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ClientesView } from '#/presentation/views/clientes/ClientesView'

export const Route = createFileRoute('/(portal)/_portal/clientes')({
    component: ClientesPage,
})

function ClientesPage() {
    return (
        <div className="space-y-8">
            <ClientesHeader
                paso="Paso 1 de 2"
                titulo="Seleccioná un cliente"
                descripcion="Elegí para quién vas a pesar. Después de eso se abre la báscula."
            />

            <Suspense fallback={<LoadingState label='Cargando clientes...' />}>
                <ClientesView />
            </Suspense>
        </div>
    )
}
