import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
    '/(portal)/_portal/administracion-documentos-fiscales',
)({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div>Hello "/(portal)/_portal/administracion-documentos-fiscales"!</div>
    )
}
