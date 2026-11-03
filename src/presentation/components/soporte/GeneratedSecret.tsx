import { useEffect, useRef, useState } from 'react'
import { Check, Copy, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

const CONFIRMACION_COPIADO_MS = 2000

interface GeneratedSecretProps {
    /** Qué es, en la etiqueta de arriba: "PIN", "Contraseña temporal". */
    label: string
    value: string
    /** Qué tiene que hacer quien lo recibe, debajo del aviso. */
    hint: string
}

/**
 * Un valor que el backend genera y devuelve una sola vez (PIN, contraseña
 * temporal). Lo muestra grande, con Copiar, y avisa que no se vuelve a ver.
 */
export function GeneratedSecret({ label, value, hint }: GeneratedSecretProps) {
    const [copied, setCopied] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current)
        }
    }, [])

    const copy = async () => {
        try {
            // `navigator.clipboard` no existe fuera de un contexto seguro (HTTP plano).
            await navigator.clipboard.writeText(value)
            setCopied(true)
            if (timerRef.current !== null) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => setCopied(false), CONFIRMACION_COPIADO_MS)
        } catch {
            toast.error('No se pudo copiar. Anótelo a mano.')
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">{label}</p>
                <div className="flex items-center gap-3 rounded-2xl border border-border-ui bg-bg-app px-4 py-3">
                    <code className="flex-1 select-all break-all font-mono text-2xl font-black tracking-widest text-text-main">
                        {value}
                    </code>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copy}
                        aria-label={`Copiar ${label.toLowerCase()}`}
                    >
                        {copied ? <Check /> : <Copy />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                </div>
            </div>

            <div className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>
                    <span className="font-bold">Se muestra una sola vez.</span> Al cerrar este
                    diálogo no se puede volver a consultar. {hint}
                </p>
            </div>
        </div>
    )
}
