import { Check, Copy, RotateCcw, SquarePen } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'
import { AgriBubble } from '#/presentation/components/agri/AgriBubble'
import { AgriComposer } from '#/presentation/components/agri/AgriComposer'
import { AgriTypingIndicator } from '#/presentation/components/agri/AgriTypingIndicator'
import { AgriWelcome } from '#/presentation/components/agri/AgriWelcome'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { useAgriChat } from '#/presentation/hooks/agri/useAgriChat'

/** Lo que dura el tilde del botón de copiar antes de volver a ser un ícono. */
const CONFIRMACION_COPIADO_MS = 2000

/** El hilo y el compositor comparten ancho: si no, el texto baila al escribir. */
const ANCHO_COLUMNA = 'mx-auto w-full max-w-3xl'

export function AgriChatView() {
    const { messages, isThinking, sendMessage, regenerate, startNewChat } = useAgriChat()
    const [copiado, setCopiado] = useState(false)

    const finDelHiloRef = useRef<HTMLDivElement>(null)
    const confirmacionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Baja al final con cada mensaje nuevo y también al prenderse el
    // "pensando": el indicador tiene que quedar a la vista igual que una
    // respuesta.
    useEffect(() => {
        finDelHiloRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages, isThinking])

    useEffect(() => {
        return () => {
            if (confirmacionRef.current !== null) clearTimeout(confirmacionRef.current)
        }
    }, [])

    const copiar = async (contenido: string) => {
        try {
            // `navigator.clipboard` no existe fuera de un contexto seguro: en
            // una tablet servida por HTTP plano esto revienta, y el `catch` es
            // lo que evita que el chat se caiga por un botón secundario.
            await navigator.clipboard.writeText(contenido)

            setCopiado(true)
            if (confirmacionRef.current !== null) clearTimeout(confirmacionRef.current)
            confirmacionRef.current = setTimeout(() => setCopiado(false), CONFIRMACION_COPIADO_MS)
        } catch {
            toast.error('No se pudo copiar la respuesta.')
        }
    }

    const hiloVacio = messages.length === 0
    const indiceUltimo = messages.length - 1

    return (
        <div className="flex h-full flex-col gap-5">
            <header className="flex shrink-0 items-center gap-3">
                <AgriAvatar />

                <div className="min-w-0 leading-tight">
                    <h1 className="text-lg font-extrabold tracking-tight text-text-main">Agri</h1>
                    <p className="truncate text-xs font-semibold text-text-muted">
                        Asistente IA de control de calidad
                    </p>
                </div>

                {/* En el teléfono queda sólo el ícono: con el texto, el
                    subtítulo no entra en la misma fila. */}
                <CustomButton
                    variant="secondary"
                    fullWidth={false}
                    disabled={hiloVacio}
                    onClick={startNewChat}
                    icon={<SquarePen className="size-4" strokeWidth={2.2} />}
                    aria-label="Nueva conversación"
                    className="ml-auto shrink-0 max-sm:gap-0"
                >
                    <span className="hidden sm:inline">Nueva conversación</span>
                </CustomButton>
            </header>

            <div className="flex-1 overflow-y-auto">
                {hiloVacio ? (
                    <div className={`${ANCHO_COLUMNA} h-full`}>
                        <AgriWelcome onSend={sendMessage} />
                    </div>
                ) : (
                    <div className={`${ANCHO_COLUMNA} space-y-6 py-2`}>
                        {messages.map((message, indice) => (
                            <AgriBubble key={message.id} message={message}>
                                {message.role === 'agri' && indice === indiceUltimo && !isThinking && (
                                    <ResponseActions
                                        copiado={copiado}
                                        onCopy={() => void copiar(message.content)}
                                        onRegenerate={regenerate}
                                    />
                                )}
                            </AgriBubble>
                        ))}

                        {isThinking && <AgriTypingIndicator />}
                    </div>
                )}

                <div ref={finDelHiloRef} />
            </div>

            <div className={`${ANCHO_COLUMNA} shrink-0 pb-[env(safe-area-inset-bottom)] md:pb-0`}>
                <AgriComposer isThinking={isThinking} onSend={sendMessage} />
            </div>
        </div>
    )
}

interface ResponseActionsProps {
    copiado: boolean
    onCopy: () => void
    onRegenerate: () => void
}

/**
 * Copiar y regenerar, sobre la última respuesta de Agri.
 *
 * Siempre visibles, no al pasar el mouse: la app se usa en tablets de planta,
 * donde no hay hover y una barra escondida ahí no existe.
 */
function ResponseActions({ copiado, onCopy, onRegenerate }: ResponseActionsProps) {
    return (
        <div className="flex items-center gap-1 pt-1">
            <ActionButton onClick={onCopy}>
                {copiado ? (
                    <Check className="size-3.5 text-success" strokeWidth={2.4} />
                ) : (
                    <Copy className="size-3.5" strokeWidth={2.2} />
                )}
                {copiado ? 'Copiado' : 'Copiar'}
            </ActionButton>

            <ActionButton onClick={onRegenerate}>
                <RotateCcw className="size-3.5" strokeWidth={2.2} />
                Regenerar
            </ActionButton>
        </div>
    )
}

interface ActionButtonProps {
    onClick: () => void
    children: ReactNode
}

function ActionButton({ onClick, children }: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-muted transition-colors duration-200 hover:bg-muted/70 hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-to/40"
        >
            {children}
        </button>
    )
}
