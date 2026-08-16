import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/_auth/login')({
    component: LoginPage,
})

function LoginPage() {
    return <div>Hello "/(auth)/_auth/login"!</div>
}
