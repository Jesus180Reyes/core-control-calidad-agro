import { Suspense, useEffect } from 'react'
import { createFileRoute, redirect, useLocation, useNavigate } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { LotesView } from '#/presentation/views/lotes/LotesView'

export const Route = createFileRoute('/(portal)/_portal/lotes-clientes')({
    beforeLoad: ({ location }) => {
        if (!location.state.cliente) {
            throw redirect({ to: '/clientes' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate()
    const cliente = useLocation({ select: (location) => location.state.cliente }) ?? null

    useEffect(() => {
        if (!cliente) {
            navigate({ to: '/clientes', replace: true })
        }
    }, [cliente, navigate])

    if (!cliente) return null

    return (
        <div className="space-y-8">
            <ClientesHeader
                paso="Paso 2 de 2"
                titulo="Seleccioná un lote"
                descripcion={`Elegí el lote de ${cliente.nombre} que vas a pesar. Después de eso se abre la báscula.`}
            />

            <Suspense fallback={<LoadingState label="Cargando lotes..." />}>
                <LotesView cliente={cliente} />
            </Suspense>
        </div>
    )
}
