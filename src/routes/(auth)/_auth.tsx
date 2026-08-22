import { useEffect } from 'react'
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'

import { leerToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import { useAuth } from '#/presentation/hooks/auth/useAuth'

export const Route = createFileRoute('/(auth)/_auth')({
    beforeLoad: async () => {
        if (typeof window !== 'undefined' && leerToken()) {
            throw redirect({ to: '/' })
        }
    },
    component: AuthLayout,
})

function AuthLayout() {
    const navigate = useNavigate()
    const { estaAutenticado } = useAuth()
    useEffect(() => {
        if (estaAutenticado) {
            navigate({ to: '/', replace: true })
        }
    }, [estaAutenticado, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-app">
            <Outlet />
        </div>
    )
}
