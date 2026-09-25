import { createFileRoute } from '@tanstack/react-router'

import { AgriChatView } from '#/presentation/views/agri/AgriChatView'

export const Route = createFileRoute('/(portal)/_portal/agri')({
    component: RouteComponent,
})

function RouteComponent() {
    // El chat ocupa justo la pantalla: se le resta el padding de `<main>`
    // (p-4 / md:p-8) y, en el teléfono, el header de `MobileNav`. Con `dvh`
    // el compositor no queda detrás de la barra del navegador.
    return (
        <div className="flex h-[calc(100dvh_-_2rem_-_var(--mobile-nav-h))] flex-col md:h-[calc(100vh-4rem)]">
            <AgriChatView />
        </div>
    )
}
