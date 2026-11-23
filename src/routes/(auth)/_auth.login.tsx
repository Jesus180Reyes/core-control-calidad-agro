import { createFileRoute } from '@tanstack/react-router'

import { useLogin } from '#/presentation/hooks/auth/useLogin'
import { LoginCard } from '#/presentation/views/auth/LoginCard'

export const Route = createFileRoute('/(auth)/_auth/login')({
    component: LoginPage,
})

function LoginPage() {
    const {
        control,
        onSubmit,
        enviando,
        errorLogin,
        verPassword,
        alternarVerPassword,
        rememberUsername,
        toggleRememberUsername,
        focusPassword,
        expiredCredentials,
        closeExpiredDialog,
        handlePasswordRenewed,
    } = useLogin()

    return (
        <LoginCard
            control={control}
            onSubmit={onSubmit}
            enviando={enviando}
            errorLogin={errorLogin}
            verPassword={verPassword}
            alternarVerPassword={alternarVerPassword}
            rememberUsername={rememberUsername}
            onToggleRememberUsername={toggleRememberUsername}
            onUsernameEnter={focusPassword}
            expiredCredentials={expiredCredentials}
            closeExpiredDialog={closeExpiredDialog}
            handlePasswordRenewed={handlePasswordRenewed}
        />
    )
}
