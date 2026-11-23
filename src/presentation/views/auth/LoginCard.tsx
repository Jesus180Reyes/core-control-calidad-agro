import type { KeyboardEvent } from 'react'
import type { Control } from 'react-hook-form'

import { ExpiredPasswordDialog } from '#/presentation/components/auth/ExpiredPasswordDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import type { LoginFormValues } from '#/presentation/hooks/auth/loginSchema'
import type { ExpiredCredentials } from '#/presentation/hooks/auth/useLogin'

interface LoginCardProps {
    control: Control<LoginFormValues>
    onSubmit: () => void
    enviando: boolean
    errorLogin: string | null
    verPassword: boolean
    alternarVerPassword: () => void
    rememberUsername: boolean
    onToggleRememberUsername: () => void
    onUsernameEnter: () => void
    expiredCredentials: ExpiredCredentials | null
    closeExpiredDialog: () => void
    handlePasswordRenewed: () => void
}

const FIELD_CLASSES = [
    '[&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-transparent [&_input]:bg-surface dark:[&_input]:bg-surface',
    '[&_input]:shadow-[0_1px_2px_rgb(15_23_42/0.04),0_6px_16px_-10px_rgb(15_23_42/0.18)]',
].join(' ')

const BRAND_SHADOW = 'shadow-[0_9px_14px_-6px_rgb(46_107_69/0.32)]'

export function LoginCard({
    control,
    onSubmit,
    enviando,
    errorLogin,
    verPassword,
    alternarVerPassword,
    rememberUsername,
    onToggleRememberUsername,
    onUsernameEnter,
    expiredCredentials,
    closeExpiredDialog,
    handlePasswordRenewed,
}: LoginCardProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== 'Enter') return
        if ((event.target as HTMLElement).id !== 'username') return
        event.preventDefault()
        onUsernameEnter()
    }

    return (
        <>
            {expiredCredentials && (
                <ExpiredPasswordDialog
                    username={expiredCredentials.username}
                    currentPassword={expiredCredentials.password}
                    onRenewed={handlePasswordRenewed}
                    onClose={closeExpiredDialog}
                />
            )}

            <div className="font-poppins min-h-dvh flex flex-col bg-linear-to-b from-brand-soft from-0% to-bg-app to-55% transition-colors duration-300">
                <main className="flex-1 flex items-center justify-center px-6 py-12 sm:px-10">
                    <div className="w-full max-w-[420px] flex flex-col">
                        <BrandMark className="self-center mb-7" />

                        <header className="mb-9 space-y-2.5 text-center">
                            <h1 className="text-[28px] sm:text-[32px] leading-tight font-semibold tracking-[-0.02em] text-text-main">
                                Hola de nuevo
                            </h1>
                            <p className="mx-auto max-w-[340px] text-sm leading-relaxed text-text-muted">
                                Ingresá con tu usuario y contraseña de planta para seguir con el control.
                            </p>
                        </header>

                        <form
                            noValidate
                            onKeyDown={handleKeyDown}
                            onSubmit={(evento) => {
                                evento.preventDefault()
                                onSubmit()
                            }}
                            className="flex flex-col gap-4"
                        >
                            <ControlledInput
                                name="username"
                                control={control}
                                placeholder="Usuario"
                                uppercase
                                autoComplete="username"
                                disabled={enviando}
                                icon={<UserIcon />}
                                className={`${FIELD_CLASSES} [&_input]:font-chivo-mono`}
                            />

                            <ControlledInput
                                autoComplete="current-password"
                                name="password"
                                control={control}
                                placeholder="Contraseña"
                                type={verPassword ? 'text' : 'password'}
                                disabled={enviando}
                                icon={<LockIcon />}
                                className={FIELD_CLASSES}
                                accionDerecha={
                                    <button
                                        type="button"
                                        onClick={alternarVerPassword}
                                        disabled={enviando}
                                        className="flex items-center justify-center size-8 rounded-full text-text-muted hover:text-brand hover:bg-brand-soft transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
                                        aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        <PasswordVisibilityIcon visible={verPassword} />
                                    </button>
                                }
                            />

                            <label className="flex w-fit items-center gap-3 px-2 py-1.5 rounded-xl cursor-pointer select-none hover:bg-brand-soft/80 transition-colors duration-200 has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:bg-transparent">
                                <input
                                    type="checkbox"
                                    checked={rememberUsername}
                                    onChange={onToggleRememberUsername}
                                    disabled={enviando}
                                    className="size-[18px] shrink-0 accent-brand-deep cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="text-sm text-text-main">Recordar usuario</span>
                            </label>

                            {errorLogin && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2.5 rounded-2xl border border-rose-600/20 bg-rose-600/8 px-4 py-3 text-sm font-medium text-rose-600 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-400"
                                >
                                    <AlertIcon />
                                    <span className="leading-snug">{errorLogin}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={enviando}
                                className={`mt-2 w-full h-[54px] flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-brand-deep to-brand-alt text-white text-[15px] font-semibold ${BRAND_SHADOW} transition-[filter,transform,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_12px_20px_-8px_rgb(46_107_69/0.45)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:brightness-100 cursor-pointer`}
                            >
                                {enviando ? (
                                    <>
                                        <SpinnerIcon />
                                        Ingresando…
                                    </>
                                ) : (
                                    'Ingresar'
                                )}
                            </button>
                        </form>
                    </div>
                </main>

                <footer className="pb-8 px-6 text-center text-xs text-text-muted">
                    Metrika 360 · Control de calidad en planta
                </footer>
            </div>
        </>
    )
}

function BrandMark({ className = '' }: { className?: string }) {
    return (
        <div
            className={`flex items-center justify-center size-[72px] rounded-[22px] bg-linear-to-br from-brand-deep to-brand-alt text-white ${BRAND_SHADOW} ${className}`}
        >
            <ScanCheckIcon />
        </div>
    )
}

function ScanCheckIcon() {
    return (
        <svg
            className="size-10"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
            <path d="M8.75 12.25 11 14.5l4.25-4.75" />
        </svg>
    )
}

function UserIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 1115 0" />
        </svg>
    )
}

function LockIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
            <path strokeLinecap="round" d="M8 10.5V7a4 4 0 118 0v3.5" />
        </svg>
    )
}

function AlertIcon() {
    return (
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
        </svg>
    )
}

function SpinnerIcon() {
    return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
    )
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
    if (visible) {
        return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
            </svg>
        )
    }

    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
