import { ArrowUp } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

/** A partir de acá el textarea deja de crecer y scrollea por dentro. */
const ALTURA_MAXIMA_PX = 180

const AVISO_LEGAL = 'Agri puede equivocarse. Verificá los datos críticos.'

interface AgriComposerProps {
    /** Mientras Agri responde, el compositor no manda nada más. */
    isThinking: boolean
    onSend: (content: string) => void
}

/**
 * El compositor del chat: el textarea que crece con el contenido y el botón de
 * enviar. El borrador vive acá y no en `useAgriChat` — lo que el usuario está
 * tipeando no es parte del hilo hasta que lo manda.
 */
export function AgriComposer({ isThinking, onSend }: AgriComposerProps) {
    const [borrador, setBorrador] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const sinTexto = borrador.trim() === ''
    const deshabilitado = sinTexto || isThinking

    // El alto se recalcula en cada cambio, y también al vaciarse después de
    // enviar: sin esto el textarea quedaría alto con el borrador ya ido.
    useLayoutEffect(() => {
        const textarea = textareaRef.current
        if (textarea === null) return

        // El `auto` no es redundante: sin volver a cero primero, `scrollHeight`
        // nunca baja y el textarea sólo sabe crecer.
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, ALTURA_MAXIMA_PX)}px`
    }, [borrador])

    const enviar = () => {
        if (deshabilitado) return

        onSend(borrador)
        setBorrador('')
    }

    const alPresionarTecla = (evento: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (evento.key !== 'Enter' || evento.shiftKey) return
        // Un acento o una ñ a medio componer también disparan `Enter`: mandar
        // ahí cortaría la palabra por la mitad.
        if (evento.nativeEvent.isComposing) return

        evento.preventDefault()
        enviar()
    }

    return (
        <div>
            {/* El borde es un gradiente, y un gradiente no se pinta con
                `border-color`: el marco es este `p-px` con el degradé de fondo,
                que al foco pasa del gris del borde al verde de Agri. */}
            <div
                className={
                    'rounded-[28px] p-px transition-all duration-300 ease-out ' +
                    'bg-linear-to-r from-border-ui via-border-ui to-border-ui ' +
                    'focus-within:from-agri-from focus-within:via-agri-to focus-within:to-agri-from ' +
                    'focus-within:shadow-[0_10px_40px_-14px_var(--agri-to)]'
                }
            >
                <div className="flex items-end gap-2 rounded-[27px] bg-surface px-3 py-2 shadow-clay-card">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={borrador}
                        onChange={(evento) => setBorrador(evento.target.value)}
                        onKeyDown={alPresionarTecla}
                        placeholder="Preguntale a Agri sobre lotes, pesajes o calidad…"
                        aria-label="Mensaje para Agri"
                        className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-text-main outline-none placeholder:text-text-muted/70"
                    />

                    <button
                        type="button"
                        onClick={enviar}
                        disabled={deshabilitado}
                        aria-label="Enviar mensaje"
                        className={
                            'shrink-0 grid place-items-center size-10 rounded-full text-white ' +
                            'bg-linear-to-br from-agri-from to-agri-to shadow-clay-btn ' +
                            'transition-all duration-200 ease-out hover:scale-105 active:scale-95 ' +
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-to/50 ' +
                            'disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed'
                        }
                    >
                        <ArrowUp className="size-5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <p className="mt-2 text-center text-[11px] font-medium text-text-muted/80">
                {AVISO_LEGAL}
            </p>
        </div>
    )
}
