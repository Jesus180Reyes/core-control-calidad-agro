import { useEffect } from 'react'
import { Sidebar } from '#/presentation/components/shared/SideBar'
import { leerToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'

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
    const navigate = useNavigate()
    const { estaAutenticado } = useAuth()

    // `beforeLoad` no vuelve a correr en una carga directa: cuando el HTML llegó
    // ya renderizado por el SSR, TanStack Start no repite `router.load()` al
    // hidratar y el guard del servidor se salta la comprobación (no hay
    // `localStorage` ahí). Este efecto es el respaldo del lado del cliente.
    useEffect(() => {
        if (!estaAutenticado) {
            navigate({ to: '/login', replace: true })
        }
    }, [estaAutenticado, navigate])

    return <div className="flex w-full min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
            <Outlet />
        </main>
    </div>
}
