import type { ReactNode } from 'react'
import type { Control } from 'react-hook-form'

import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import type { LoginFormValues } from '#/presentation/hooks/auth/loginSchema'
interface LoginCardProps {
    control: Control<LoginFormValues>
    onSubmit: () => void
    enviando: boolean
    errorLogin: string | null
    verPassword: boolean
    alternarVerPassword: () => void
}
export function LoginCard({ control, onSubmit, enviando, errorLogin, verPassword, alternarVerPassword }: LoginCardProps) {
    return (
        <div className="w-full max-w-sm md:max-w-4xl grid md:grid-cols-2 overflow-hidden bg-surface border border-border-ui/60 rounded-[28px] md:rounded-4xl shadow-clay-card transition-colors duration-300">
            <BrandPanel />

            <div className="p-8 sm:p-10 md:p-12 flex flex-col justify-center">
                <div className="md:hidden">
                    <LogoBascula />
                </div>

                <header className="mb-7 space-y-1.5">
                    <h2 className="text-2xl font-black tracking-tight text-text-main">
                        Bienvenido de nuevo
                    </h2>
                    <p className="text-sm text-text-muted">
                        Ingresá tus credenciales para operar la báscula.
                    </p>
                </header>

                <form
                    onSubmit={(evento) => {
                        evento.preventDefault()
                        onSubmit()
                    }}
                    className="space-y-5"
                >
                    <ControlledInput
                        name="username"
                        control={control}
                        label="Usuario"
                        placeholder="Ingresá tu usuario"
                        uppercase
                        icon={<IconoUsuario />}
                    />

                    <ControlledInput
                        autoComplete="off"
                        name="password"
                        control={control}
                        label="Contraseña"
                        placeholder="Ingresá tu contraseña"
                        type={verPassword ? 'text' : 'password'}
                        icon={<IconoCandado />}
                        accionDerecha={
                            <button
                                type="button"
                                onClick={alternarVerPassword}
                                className="flex items-center justify-center size-7 rounded-lg text-text-muted/70 hover:text-brand hover:bg-brand/10 transition-colors duration-200 cursor-pointer"
                                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                <IconoVisibilidadPassword visible={verPassword} />
                            </button>
                        }
                    />

                    {errorLogin && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60 rounded-xl px-3.5 py-3 text-sm font-semibold"
                        >
                            <IconoAlerta />
                            <span className="leading-snug">{errorLogin}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={enviando}
                        className="group w-full flex items-center justify-center gap-2 bg-brand text-white font-bold text-sm rounded-xl h-12 shadow-clay-btn transition-all duration-200 hover:brightness-110 hover:shadow-clay-btn-hover hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
                    >
                        {enviando ? (
                            <>
                                <IconoCargando />
                                Ingresando…
                            </>
                        ) : (
                            <>
                                Ingresar
                                <IconoFlecha />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-[11px] font-semibold tracking-wide text-text-muted/70">
                    Acceso restringido al personal autorizado
                </p>
            </div>
        </div>
    )
}

function BrandPanel() {
    return (
        <aside className="relative hidden md:flex flex-col justify-between overflow-hidden p-12 bg-linear-to-br from-indigo-400 via-indigo-500 to-violet-600 dark:from-indigo-600 dark:via-indigo-700 dark:to-violet-800">
            {/* Halos difuminados: le dan profundidad al degradado plano. */}
            <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-white/25 blur-3xl" />
            <div aria-hidden className="absolute -bottom-28 -left-20 size-80 rounded-full bg-violet-300/25 blur-3xl" />

            <div className="relative">
                <div className="w-12 h-12 bg-white/20 border border-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white">
                    <IconoBascula className="w-7 h-7" />
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight text-white leading-tight">
                    Bascula
                </h1>
                <p className="mt-1 text-[11px] font-bold tracking-[0.2em] uppercase text-white/75">
                    Quality Inspector
                </p>
                <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/90">
                    Control de calidad y pesaje en planta, con trazabilidad de cada lote.
                </p>
            </div>

            <ul className="relative space-y-3.5">
                <FeatureItem>Pesaje en vivo desde el indicador</FeatureItem>
                <FeatureItem>Parámetros de calidad por producto</FeatureItem>
                <FeatureItem>Historial y reportes de cada lote</FeatureItem>
            </ul>
        </aside>
    )
}

function FeatureItem({ children }: { children: ReactNode }) {
    return (
        <li className="flex items-center gap-3 text-sm font-medium text-white">
            <span className="flex items-center justify-center size-6 shrink-0 rounded-full bg-white/25 border border-white/30 text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </span>
            {children}
        </li>
    )
}

function LogoBascula() {
    return (
        <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-clay-btn">
                <IconoBascula className="w-6 h-6" />
            </div>
            <div className="text-center leading-tight">
                <h1 className="text-lg font-black tracking-tight text-text-main">
                    Bascula
                </h1>
                <p className="text-[10px] font-bold tracking-widest uppercase text-text-muted/70">
                    Quality Inspector
                </p>
            </div>
        </div>
    )
}

function IconoBascula({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M19 9l-7-6-7 6M5 19h14" />
        </svg>
    )
}

function IconoUsuario() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 1115 0" />
        </svg>
    )
}

function IconoCandado() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
            <path strokeLinecap="round" d="M8 10.5V7a4 4 0 118 0v3.5" />
        </svg>
    )
}

function IconoAlerta() {
    return (
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
        </svg>
    )
}

function IconoFlecha() {
    return (
        <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h15m0 0l-5.5-5.5M19 12l-5.5 5.5" />
        </svg>
    )
}

function IconoCargando() {
    return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        </svg>
    )
}

function IconoVisibilidadPassword({ visible }: { visible: boolean }) {
    if (visible) {
        return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
            </svg>
        )
    }

    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
