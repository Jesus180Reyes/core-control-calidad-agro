import { createFileRoute } from '@tanstack/react-router'

import { useLogin } from '#/presentation/hooks/auth/useLogin'
import { LoginCard } from '#/presentation/views/auth/LoginCard'

export const Route = createFileRoute('/(auth)/_auth/login')({
    component: LoginPage,
})

function LoginPage() {
    const { control, onSubmit, enviando, errorLogin, verPassword, alternarVerPassword } = useLogin()

    return (
        <LoginCard
            control={control}
            onSubmit={onSubmit}
            enviando={enviando}
            errorLogin={errorLogin}
            verPassword={verPassword}
            alternarVerPassword={alternarVerPassword}
        />
    )
}
