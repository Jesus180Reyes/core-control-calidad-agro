import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/clientes-finalizados')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/(portal)/_portal/clientes-finalizados"!</div>
}
