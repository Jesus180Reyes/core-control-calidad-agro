import { useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { loginSchema, type LoginFormValues } from '#/presentation/hooks/auth/loginSchema'
import { HttpError } from '#/infrastructure/http/http-client'
import type { LoginResponse } from '#/presentation/types/auth/auth.types'

interface UseLoginResult {
    control: Control<LoginFormValues>
    onSubmit: () => void
    enviando: boolean
    errorLogin: string | null
    verPassword: boolean
    alternarVerPassword: () => void
}

function mensajeDelServidor(body: unknown): string | null {
    if (typeof body === 'object' && body !== null && 'message' in body) {
        const { message } = body as { message: unknown }
        if (typeof message === 'string' && message.length > 0) return message
    }
    return null
}

function derivarErrorLogin(error: Error): string {
    if (error instanceof HttpError) {
        return mensajeDelServidor(error.body) ?? 'El servidor no está disponible. Intentá de nuevo.'
    }
    return 'No se pudo contactar al servidor.'
}

export function useLogin(): UseLoginResult {
    const navigate = useNavigate()
    const { iniciarSesion } = useAuth()
    const [verPassword, setVerPassword] = useState(false)
    const [errorLogin, setErrorLogin] = useState<string | null>(null)

    const { control, handleSubmit } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
    })

    const mutation = useExecuteMutation<LoginResponse, LoginFormValues>('/auth/login', {
        onSuccess: (data) => {
            if (!iniciarSesion(data)) {
                setErrorLogin('No se pudo iniciar sesión. Intentá de nuevo.')
                return
            }
            navigate({ to: '/' })
        },
        onError: (error) => {
            setErrorLogin(derivarErrorLogin(error))
        },
    })

    const onSubmit = handleSubmit((data) => {
        setErrorLogin(null)
        mutation.mutate(data)
    })

    return {
        control,
        onSubmit,
        enviando: mutation.isPending,
        errorLogin,
        verPassword,
        alternarVerPassword: () => setVerPassword((valor) => !valor),
    }
}
