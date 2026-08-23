import { useEffect } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { Sidebar } from '#/presentation/components/shared/SideBar'
import { leerToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import { useAuth } from '#/presentation/hooks/auth/useAuth'

export const Route = createFileRoute('/(portal)/_portal')({
    ssr: false,
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
    const pathname = useLocation({ select: (location) => location.pathname })


    useEffect(() => {
        if (!estaAutenticado) {
            navigate({ to: '/login', replace: true })
        }
    }, [estaAutenticado, navigate])

    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    return <div className="flex w-full min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
            <ErrorBoundary
                key={pathname}
                fallback={(error, reset) => (
                    <div className="border border-dashed border-border-ui rounded-[28px] p-12 text-center space-y-4">
                        <p className="text-text-main font-bold">No se pudo cargar la información</p>
                        <p className="text-sm text-text-muted">{error.message}</p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                limpiarErrorDeQuery()
                                reset()
                            }}
                        >
                            Reintentar
                        </Button>
                    </div>
                )}
            >
                <Outlet />
            </ErrorBoundary>
        </main>
    </div>
}
