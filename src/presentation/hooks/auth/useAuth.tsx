import { useSyncExternalStore } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { LoginResponse, Sesion, Usuario } from '#/presentation/types/auth/auth.types'
import { guardarSesion, limpiarSesion, snapshot, suscribir } from '#/presentation/hooks/auth/almacenamientoSesion'

interface UseAuthResult {
    sesion: Sesion | null
    usuario: Usuario | null
    estaAutenticado: boolean
    iniciarSesion: (respuesta: LoginResponse) => void
    logout: () => void
}

export function useAuth(): UseAuthResult {
    const navigate = useNavigate()
    const sesion = useSyncExternalStore(suscribir, snapshot, () => null)

    function iniciarSesion(respuesta: LoginResponse): void {
        guardarSesion({ accessToken: respuesta.accessToken, usuario: respuesta.user })
    }

    function logout(): void {
        limpiarSesion()
        navigate({ to: '/login' })
    }

    return {
        sesion,
        usuario: sesion?.usuario ?? null,
        estaAutenticado: sesion !== null,
        iniciarSesion,
        logout,
    }
}
