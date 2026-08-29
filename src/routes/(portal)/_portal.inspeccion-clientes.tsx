import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/inspeccion-clientes')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/(portal)/_portal/inspeccion-clientes"!</div>
}
