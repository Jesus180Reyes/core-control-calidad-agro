import { useMemo, useState } from 'react'
import { useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import {
    RENEW_PASSWORD_MESSAGES,
    createRenewPasswordSchema,
    type RenewPasswordFormValues,
} from '#/presentation/hooks/auth/renewPasswordSchema'
import { mensajeDeError } from '#/infrastructure/http/http-client'
import type { RenovarPasswordRequest, RenovarPasswordResponse } from '#/presentation/types/auth/auth.types'

interface UseRenewPasswordParams {
    /** El mismo valor que mandó el login, que el backend acaba de aceptar: no se transforma. */
    username: string
    /** La contraseña del intento que dio el 403. Vive solo en memoria. */
    currentPassword: string
    /** La renovación no devuelve token: quien llama cierra el diálogo y el usuario ingresa a mano. */
    onRenewed: () => void
}

export interface RenewPasswordRule {
    label: string
    met: boolean
}

interface UseRenewPasswordResult {
    control: Control<RenewPasswordFormValues>
    onSubmit: () => void
    enviando: boolean
    errorRenovacion: string | null
    rules: RenewPasswordRule[]
    verPassword: boolean
    alternarVerPassword: () => void
}

export function useRenewPassword({ username, currentPassword, onRenewed }: UseRenewPasswordParams): UseRenewPasswordResult {
    const [verPassword, setVerPassword] = useState(false)
    const [errorRenovacion, setErrorRenovacion] = useState<string | null>(null)

    const schema = useMemo(() => createRenewPasswordSchema(currentPassword), [currentPassword])

    const { control, handleSubmit } = useForm<RenewPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password_nueva: '', confirmacion: '' },
        mode: 'onChange',
        reValidateMode: 'onChange',
    })

    const [passwordNueva, confirmacion] = useWatch({ control, name: ['password_nueva', 'confirmacion'] })

    // El checklist sale del mismo schema que valida el envío: una regla está
    // cumplida si su mensaje no figura entre los errores. Con el campo vacío
    // queda neutra, para no dar por buena "distinta de la actual" ni
    // "coinciden" antes de que se escriba nada.
    const rules = useMemo<RenewPasswordRule[]>(() => {
        const resultado = schema.safeParse({ password_nueva: passwordNueva, confirmacion })
        const fallidas = new Set(resultado.success ? [] : resultado.error.issues.map((issue) => issue.message))

        return Object.entries(RENEW_PASSWORD_MESSAGES).map(([regla, label]) => {
            const valor = regla === 'matches' ? confirmacion : passwordNueva
            return { label, met: valor !== '' && !fallidas.has(label) }
        })
    }, [schema, passwordNueva, confirmacion])

    const mutation = useExecuteMutation<RenovarPasswordResponse, RenovarPasswordRequest>('/auth/renovar-password', {
        onSuccess: (data) => {
            toast.success(data.msg || 'Contraseña actualizada correctamente', {
                description: 'Ingresá con tu contraseña nueva.',
            })
            onRenewed()
        },
        // Con `onError` propio no sale el toast automático: el error se pinta
        // dentro del diálogo, que sigue abierto para reintentar o cancelar.
        onError: (error) => {
            setErrorRenovacion(mensajeDeError(error))
        },
    })

    const onSubmit = handleSubmit((data) => {
        setErrorRenovacion(null)
        mutation.mutate({
            username,
            password_actual: currentPassword,
            password_nueva: data.password_nueva,
        })
    })

    return {
        control,
        onSubmit,
        enviando: mutation.isPending,
        errorRenovacion,
        rules,
        verPassword,
        alternarVerPassword: () => setVerPassword((valor) => !valor),
    }
}
