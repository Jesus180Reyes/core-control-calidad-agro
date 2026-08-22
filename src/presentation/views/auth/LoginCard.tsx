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
        <div className="w-full max-w-sm bg-surface border border-border-ui/50 rounded-[28px] p-8 shadow-clay-card transition-colors duration-300">
            <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-11 h-11 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-clay-btn">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M19 9l-7-6-7 6M5 19h14" />
                    </svg>
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

            <form
                onSubmit={(evento) => {
                    evento.preventDefault()
                    onSubmit()
                }}
                className="space-y-4"
            >
                <ControlledInput
                    name="username"
                    control={control}
                    label="Usuario"
                    placeholder="Ingresá tu usuario"
                />

                <ControlledInput
                    name="password"
                    control={control}
                    label="Contraseña"
                    placeholder="Ingresá tu contraseña"
                    type={verPassword ? 'text' : 'password'}
                    accionDerecha={
                        <button
                            type="button"
                            onClick={alternarVerPassword}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {verPassword ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    }
                />

                {errorLogin && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200/60 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
                        {errorLogin}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm rounded-xl py-2.5 shadow-clay-btn transition-colors duration-200 hover:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                    {enviando ? 'Ingresando…' : 'Ingresar'}
                </button>
            </form>
        </div>
    )
}
