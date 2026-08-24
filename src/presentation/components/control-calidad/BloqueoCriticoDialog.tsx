import { useEffect, useRef, useState } from 'react'
import { KeyRound, Lock } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { PinInput } from '#/presentation/components/shared/inputs/PinInput'

const LARGO_PIN = 4

interface BloqueoCriticoDialogProps {
    isOpen: boolean
    onAutorizar: (pin: string) => Promise<boolean> | void
    onRechazar: () => void
}

export function BloqueoCriticoDialog({
    isOpen,
    onAutorizar,
    onRechazar,
}: BloqueoCriticoDialogProps) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [validando, setValidando] = useState(false)
    const pinRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!isOpen) return
        setPin('')
        setError(null)
        setValidando(false)
    }, [isOpen])

    const rechazarPin = (mensaje: string) => {
        setError(mensaje)
        setPin('')
        pinRef.current?.focus()
    }

    const autorizar = async () => {
        if (pin.length < LARGO_PIN || validando) return

        setValidando(true)
        try {
            const esValido = await onAutorizar(pin)
            if (esValido === false) rechazarPin('El PIN ingresado es incorrecto.')
            else setPin('')
        } catch {
            rechazarPin('Error al validar el PIN. Intente de nuevo.')
        } finally {
            setValidando(false)
        }
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent
                showCloseButton={false}
                className="max-w-105 rounded-[2.5rem] border-2 border-red-500 bg-surface p-8 shadow-2xl outline-none"
            >
                <DialogHeader className="items-center text-center">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-500/20">
                        <Lock className="size-8 text-white" strokeWidth={2.5} />
                    </div>

                    <DialogTitle className="text-xl font-black text-text-main">
                        Bloqueo Crítico
                    </DialogTitle>
                    <DialogDescription className="px-2 text-sm leading-relaxed text-text-muted">
                        Se ha detectado una desviación de peso fuera de los límites de tolerancia.
                        Se requiere autorización de supervisión para continuar.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="flex flex-col gap-6"
                    onSubmit={(e) => {
                        e.preventDefault()
                        autorizar()
                    }}
                >
                    <div className="flex flex-col gap-2">
                        <span className="flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                            <KeyRound className={`size-4 ${error ? 'text-red-500' : ''}`} />
                            PIN de supervisor
                        </span>

                        <PinInput
                            ref={pinRef}
                            value={pin}
                            onChange={(valor) => {
                                setPin(valor)
                                if (error) setError(null)
                            }}
                            length={LARGO_PIN}
                            invalid={error !== null}
                            autoFocus
                            masked
                        />

                        {error && (
                            <p className="px-2 text-xs font-bold text-red-600 dark:text-red-400">
                                ⚠️ {error}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <CustomButton
                            type="submit"
                            variant="danger"
                            isLoading={validando}
                            disabled={pin.length < LARGO_PIN}
                        >
                            Autorizar Lote
                        </CustomButton>

                        <CustomButton
                            type="button"
                            variant="secondary"
                            disabled={validando}
                            onClick={onRechazar}
                        >
                            Rechazar Pesaje
                        </CustomButton>
                    </div>
                </form>

                <span className="block text-center text-[10px] italic text-text-muted">
                    Esta acción será registrada en el historial de auditoría permanente.
                </span>
            </DialogContent>
        </Dialog>
    )
}
