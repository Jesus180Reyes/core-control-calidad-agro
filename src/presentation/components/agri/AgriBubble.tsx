import type { ReactNode } from 'react'

import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'
import { MarkdownContent } from '#/presentation/components/shared/MarkdownContent'
import type { AgriMessage } from '#/presentation/types/agri/agri.types'

interface AgriBubbleProps {
    message: AgriMessage
    /** La barra de acciones. La vista sólo la manda para la última respuesta. */
    children?: ReactNode
}

/**
 * Un mensaje del hilo. Dos formas bien distintas según quién lo escribió: el
 * del usuario es un globo de marca a la derecha; el de Agri **no tiene globo**,
 * como en Gemini, porque una respuesta de varios párrafos con tabla y código
 * encerrada en una cápsula se lee peor que el texto suelto.
 */
export function AgriBubble({ message, children }: AgriBubbleProps) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-lg bg-brand px-4 py-3 shadow-clay-btn">
                    {/* Texto plano, sin `MarkdownContent`: el color del markdown
                        sale de los `prose-*`, que sobre el globo de marca hay
                        que reencauzar elemento por elemento y termina ganando
                        cualquiera. Acá `text-brand-foreground` es blanco en tema
                        claro y oscuro en el oscuro, que es lo que contrasta con
                        el globo en cada tema. De paso el mensaje se ve tal cual
                        se tipeó, como en Gemini: nadie espera que su propio
                        `**hola**` salga en negrita. */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-brand-foreground">
                        {message.content}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-3">
            <AgriAvatar />

            {/* El `min-w-0` es lo que deja que un bloque de código largo
                scrollee por dentro en vez de estirar la columna del hilo. */}
            <div className="min-w-0 flex-1 space-y-2 pt-1">
                {/* `animated` siempre: la key de la lista es el `id`, así que
                    cada burbuja se monta una sola vez y la aparición palabra
                    por palabra corre para la respuesta que llega, no para las
                    que ya estaban. */}
                <MarkdownContent content={message.content} animated />
                {children}
            </div>
        </div>
    )
}
