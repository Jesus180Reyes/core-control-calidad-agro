import { useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { guardarPermisos } from '#/presentation/hooks/auth/almacenamientoSesion'
import { loginSchema, type LoginFormValues } from '#/presentation/hooks/auth/loginSchema'
import { isExpiredPasswordError } from '#/presentation/hooks/auth/passwordVencida'
import { httpGet, mensajeDeError } from '#/infrastructure/http/http-client'
import type { LoginResponse, PermisosResponse } from '#/presentation/types/auth/auth.types'
import { advertirPermisosDesconocidos } from '#/presentation/types/auth/permissions'

/** Las credenciales del intento que dio el 403 de contraseña vencida (SPEC 14). */
export interface ExpiredCredentials {
    username: string
    password: string
}

interface UseLoginResult {
    control: Control<LoginFormValues>
    onSubmit: () => void
    enviando: boolean
    errorLogin: string | null
    verPassword: boolean
    alternarVerPassword: () => void
    /** Con valor, el `ExpiredPasswordDialog` está abierto. */
    expiredCredentials: ExpiredCredentials | null
    closeExpiredDialog: () => void
    loginAfterRenewal: (newPassword: string) => void
}

export function useLogin(): UseLoginResult {
    const navigate = useNavigate()
    const { iniciarSesion } = useAuth()
    const [verPassword, setVerPassword] = useState(false)
    const [errorLogin, setErrorLogin] = useState<string | null>(null)
    const [cargandoPermisos, setCargandoPermisos] = useState(false)
    // Solo en memoria: una contraseña en claro no se persiste en ningún lado.
    // Se borran al cerrar el diálogo y al renovar.
    const [expiredCredentials, setExpiredCredentials] = useState<ExpiredCredentials | null>(null)

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
        onError: (error, variables) => {
            // El 403 de contraseña vencida solo llega con la contraseña correcta:
            // las credenciales del intento son válidas y las reutiliza el diálogo.
            // Salen de `variables` y no del formulario, para que sean exactamente
            // las que dieron el 403.
            if (isExpiredPasswordError(error)) {
                setExpiredCredentials({ username: variables.username, password: variables.password })
                return
            }

            setErrorLogin(mensajeDeError(error))
        },
    })

    const onSubmit = handleSubmit((data) => {
        setErrorLogin(null)
        mutation.mutate(data)
    })

    // Mismo camino de entrada que el formulario: el `onSuccess` de arriba pone
    // la sesión, pide los permisos y navega. Si falla, el error cae en el banner.
    const loginAfterRenewal = (newPassword: string) => {
        if (!expiredCredentials) return

        const { username } = expiredCredentials
        setExpiredCredentials(null)
        setErrorLogin(null)
        mutation.mutate({ username, password: newPassword })
    }

    return {
        control,
        onSubmit,
        enviando: mutation.isPending || cargandoPermisos,
        errorLogin,
        verPassword,
        alternarVerPassword: () => setVerPassword((valor) => !valor),
        expiredCredentials,
        closeExpiredDialog: () => setExpiredCredentials(null),
        loginAfterRenewal,
    }
}
