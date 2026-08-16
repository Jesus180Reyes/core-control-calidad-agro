import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog' // Ajusta el alias según tu proyecto

interface BloqueoCriticoDialogProps {
    isOpen: boolean
    onAutorizar: (pin: string) => Promise<boolean> | void // 👈 Ahora puede retornar si fue exitoso o no
    onRechazar: () => void
}

export function BloqueoCriticoDialog({
    isOpen,
    onAutorizar,
    onRechazar,
}: BloqueoCriticoDialogProps) {
    const [pin, setPin] = useState<string[]>(['', '', '', ''])
    const [errorPin, setErrorPin] = useState<string | null>(null) // ❌ Estado para capturar el error

    const handlePinChange = (value: string, index: number) => {
        if (!/^[0-9]?$/.test(value)) return
        if (errorPin) setErrorPin(null) // Limpiamos el error si vuelve a escribir

        const newPin = [...pin]
        newPin[index] = value
        setPin(newPin)

        if (value !== '' && index < 3) {
            const nextInput = document.getElementById(`dialog-pin-${index + 1}`)
            nextInput?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
            const prevInput = document.getElementById(`dialog-pin-${index - 1}`)
            prevInput?.focus()
        }
    }

    const handleAutorizar = async () => {
        const pinCompleto = pin.join('')
        if (pinCompleto.length === 4) {
            try {
                // Ejecutamos la validación que viene del padre
                const esValido = await onAutorizar(pinCompleto)

                if (esValido === false) {
                    // Si el padre nos retorna false, lanzamos el estado de error
                    setErrorPin('El PIN ingresado es incorrecto.')
                    setPin(['', '', '', '']) // Reseteamos el PIN para reintentar
                    document.getElementById('dialog-pin-0')?.focus() // Foco al primer input
                } else {
                    setErrorPin(null)
                    setPin(['', '', '', ''])
                }
            } catch (err) {
                setErrorPin('Error al validar el PIN. Intente de nuevo.')
            }
        }
    }

    const handleCloseRechazar = () => {
        onRechazar()
        setPin(['', '', '', ''])
        setErrorPin(null)
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="max-w-[420px] rounded-[2.5rem] border-2 border-red-500 bg-white dark:bg-zinc-950 p-8 shadow-2xl [&>button]:hidden outline-none"
            >
                <DialogHeader className="hidden">
                    <DialogTitle>Bloqueo Crítico</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center text-center">
                    {/* Icono de Candado Rojo */}
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mb-6">
                        <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                    </div>

                    {/* Título y Mensaje */}
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        Bloqueo Crítico
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed px-2 mb-4">
                        Se ha detectado una desviación de peso fuera de los límites de tolerancia.
                        Se requiere autorización de supervisión para continuar.
                    </p>

                    {/* Sección PIN de Supervisor */}
                    <div className="w-full mb-6">
                        <label className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase block mb-2 text-left px-2">
                            PIN DE SUPERVISOR
                        </label>

                        <div className={`flex items-center gap-3 bg-blue-50/50 dark:bg-zinc-900 border rounded-2xl px-4 py-3 transition-colors ${errorPin ? 'border-red-500 bg-red-50/50 dark:bg-red-950/10' : 'border-blue-100 dark:border-zinc-800'
                            }`}>
                            {/* Icono Llave */}
                            <svg
                                className={`w-5 h-5 ${errorPin ? 'text-red-500' : 'text-slate-400'}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                                />
                            </svg>

                            {/* Inputs del PIN */}
                            <div className="flex justify-between w-full px-4">
                                {pin.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`dialog-pin-${index}`}
                                        type="password"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handlePinChange(e.target.value, index)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        className="w-8 h-8 text-center text-xl font-bold bg-transparent border-b-2 border-slate-300 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-slate-800 dark:text-white"
                                        placeholder="•"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 🛑 Alerta de PIN Incorrecto con animación suave */}
                        {errorPin && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-2 text-left px-2 animate-bounce">
                                ⚠️ {errorPin}
                            </p>
                        )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="w-full space-y-3">
                        <button
                            onClick={handleAutorizar}
                            disabled={pin.join('').length < 4}
                            className="w-full bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                        >
                            Autorizar Lote
                        </button>

                        <button
                            onClick={handleCloseRechazar}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800/80 active:scale-[0.98] cursor-pointer"
                        >
                            Rechazar Pesaje
                        </button>
                    </div>

                    <span className="text-[10px] italic text-slate-400 dark:text-zinc-500 mt-6 block">
                        Esta acción será registrada en el historial de auditoría permanente.
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    )
}