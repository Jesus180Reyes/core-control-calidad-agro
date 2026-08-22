import { Sidebar } from '#/presentation/components/shared/SideBar'
import { leerToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal')({
    notFoundComponent: () => (
        <div>
            <h1>404</h1>
            <p>Page not found.</p>
        </div>
    ),

    beforeLoad: async () => {
        if (typeof window !== 'undefined' && !leerToken()) {
            throw redirect({ to: '/login' })
        }
    },
    component: PortalLayout,
})

function PortalLayout() {

    return <div className="flex w-full min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
            <Outlet />
        </main>
    </div>
}
