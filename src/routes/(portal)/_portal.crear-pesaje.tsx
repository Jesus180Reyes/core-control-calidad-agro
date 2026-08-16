import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
    '/(portal)/_portal/crear-pesaje',
)({
    component: CreatePesajePage,
})

function CreatePesajePage() {
    return <div>Hello "/(portal)/(control-calidad)/_portal/crear-pesaje"!</div>
}
