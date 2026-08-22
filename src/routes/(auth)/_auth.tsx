import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { leerToken } from '#/presentation/hooks/auth/almacenamientoSesion'

export const Route = createFileRoute('/(auth)/_auth')({
    beforeLoad: async () => {
        if (typeof window !== 'undefined' && leerToken()) {
            throw redirect({ to: '/' })
        }
    },
    component: AuthLayout,
})

function AuthLayout() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
            <Outlet />
        </div>
    )
}
