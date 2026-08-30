import { useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { guardarPermisos } from '#/presentation/hooks/auth/almacenamientoSesion'
import { loginSchema, type LoginFormValues } from '#/presentation/hooks/auth/loginSchema'
import { httpGet, mensajeDeError } from '#/infrastructure/http/http-client'
import type { LoginResponse, PermisosResponse } from '#/presentation/types/auth/auth.types'
import { advertirPermisosDesconocidos } from '#/presentation/types/auth/permissions'

interface UseLoginResult {
    control: Control<LoginFormValues>
    onSubmit: () => void
    enviando: boolean
    errorLogin: string | null
    verPassword: boolean
    alternarVerPassword: () => void
}

export function useLogin(): UseLoginResult {
    const navigate = useNavigate()
    const { iniciarSesion } = useAuth()
    const [verPassword, setVerPassword] = useState(false)
    const [errorLogin, setErrorLogin] = useState<string | null>(null)
    const [cargandoPermisos, setCargandoPermisos] = useState(false)

    const { control, handleSubmit } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
    })

    const mutation = useExecuteMutation<LoginResponse, LoginFormValues>('/auth/login', {
        onSuccess: async (data) => {
            if (!iniciarSesion(data)) {
                setErrorLogin('No se pudo iniciar sesión. Intentá de nuevo.')
                return
            }

            // Después de `iniciarSesion`: el `Bearer` lo inyecta el interceptor
            // leyendo el token de `localStorage`, que recién ahora existe.
            setCargandoPermisos(true)
            try {
                const respuesta = await httpGet<PermisosResponse>('/permisos/me')
                advertirPermisosDesconocidos(respuesta.permisos)
                guardarPermisos(respuesta.permisos)
            } catch {
                // Un fallo acá no bloquea la entrada: se sigue con `permisos: []`.
            } finally {
                setCargandoPermisos(false)
            }

            navigate({ to: '/' })
        },
        // Con `onError` propio no sale el toast automático: el login pinta el
        // error dentro del formulario, no flotando.
        onError: (error) => {
            setErrorLogin(mensajeDeError(error))
        },
    })

    const onSubmit = handleSubmit((data) => {
        setErrorLogin(null)
        mutation.mutate(data)
    })

    return {
        control,
        onSubmit,
        enviando: mutation.isPending || cargandoPermisos,
        errorLogin,
        verPassword,
        alternarVerPassword: () => setVerPassword((valor) => !valor),
    }
}
