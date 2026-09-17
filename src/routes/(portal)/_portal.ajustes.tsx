import { createFileRoute } from '@tanstack/react-router'

import { SettingsView } from '#/presentation/views/ajustes/SettingsView'

export const Route = createFileRoute('/(portal)/_portal/ajustes')({
    component: RouteComponent,
})

function RouteComponent() {
    return <SettingsView />
}
