import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/clientes')({
    component: ClientesPage,
})

function ClientesPage() {
    return <div>Hello "/(portal)/(clientes)/_portal/clientes"!</div>
}
