import { createFileRoute } from '@tanstack/react-router'

import { AgriChatView } from '#/presentation/views/agri/AgriChatView'

export const Route = createFileRoute('/(portal)/_portal/agri')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <AgriChatView />
        </div>
    )
}
