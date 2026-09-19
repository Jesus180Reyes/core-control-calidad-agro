import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { Suspense } from 'react'

import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { useAgriSugerencias } from '#/presentation/hooks/agri/useAgriSugerencias'

const ESTILOS_GRADIENTE = 'bg-linear-to-r from-agri-from to-agri-to bg-clip-text text-transparent'

/** El ancho de la columna de sugerencias, compartido por los tres estados. */
const ANCHO_SUGERENCIAS = 'w-full max-w-2xl'

interface AgriWelcomeProps {
    onSend: (content: string) => void
}

/**
 * La pantalla vacía del chat: lo que se ve antes del primer mensaje y lo que
 * vuelve a verse al tocar "Nueva conversación".
 */
export function AgriWelcome({ onSend }: AgriWelcomeProps) {
    const { usuario } = useAuth()
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    // El nombre completo llega del backend; para un saludo alcanza el primero,
    // y si la sesión no lo trae el saludo sigue teniendo sentido sin él.
    const nombre = usuario?.complete_name.trim().split(' ')[0]

    return (
        <div className="flex h-full flex-col items-center justify-center gap-8 px-4 py-10 text-center">
            <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
                <AgriAvatar size="lg" />

                <div className="space-y-2">
                    <h2 className="text-3xl font-extrabold tracking-tight text-text-main">
                        {nombre ? 'Hola, ' : 'Hola, soy '}
                        <span className={ESTILOS_GRADIENTE}>{nombre ?? 'Agri'}</span>
                    </h2>
                    <p className="text-sm font-medium text-text-muted">
                        Soy Agri. Preguntame lo que necesites sobre lotes, pesajes y calidad.
                    </p>
                </div>
            </div>

            {/*
                El <Suspense> es de acá y no de la ruta a propósito: mientras las
                sugerencias cargan, el saludo y el compositor ya están puestos y
                el operario puede escribir. Suspender la pantalla entera por un
                arranque sugerido sería cambiar el chat por un spinner.
            */}
            <ErrorBoundary
                fallback={(_error, reset) => (
                    <SugerenciasNoDisponibles
                        onRetry={() => {
                            limpiarErrorDeQuery()
                            reset()
                        }}
                    />
                )}
            >
                <Suspense fallback={<LoadingState size="sm" className={`${ANCHO_SUGERENCIAS} py-8`} />}>
                    <SuggestedPrompts onSend={onSend} />
                </Suspense>
            </ErrorBoundary>
        </div>
    )
}

interface SuggestedPromptsProps {
    onSend: (content: string) => void
}

/**
 * Los arranques que ofrece la pantalla vacía, tal como los devuelve
 * `GET /chat/sugerencias`.
 *
 * Son del rubro y de la cartera del usuario a propósito: un chat que abre con
 * "¿En qué puedo ayudarte?" y nada más deja al operario sin saber qué se le
 * puede preguntar. Tocar uno manda la frase como si la hubiera tipeado.
 *
 * El texto es plano, no markdown: va tal cual, sin `MarkdownContent`.
 */
function SuggestedPrompts({ onSend }: SuggestedPromptsProps) {
    const { sugerencias } = useAgriSugerencias()

    return (
        <div className={`grid gap-3 sm:grid-cols-2 ${ANCHO_SUGERENCIAS}`}>
            {sugerencias.map((sugerencia, indice) => (
                <button
                    key={sugerencia}
                    type="button"
                    onClick={() => onSend(sugerencia)}
                    style={{ animationDelay: `${120 + indice * 70}ms`, animationDuration: '420ms' }}
                    className={
                        'group rounded-2xl border border-border-ui bg-surface px-4 py-3.5 text-left ' +
                        'text-sm font-semibold text-text-main shadow-clay-btn cursor-pointer ' +
                        'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-agri-to/40 ' +
                        'hover:shadow-[0_10px_28px_-14px_var(--agri-to)] active:scale-[0.98] ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-to/40 ' +
                        'animate-in fade-in slide-in-from-bottom-2 fill-mode-both'
                    }
                >
                    {sugerencia}
                </button>
            ))}
        </div>
    )
}

interface SugerenciasNoDisponiblesProps {
    onRetry: () => void
}

/**
 * Lo que queda cuando `/chat/sugerencias` falla.
 *
 * Es deliberadamente chico: las sugerencias son una comodidad, el chat funciona
 * igual escribiendo en el compositor. Pero tampoco se cae en silencio — sin
 * este aviso, la pantalla vacía parecería no tener arranques nunca.
 */
function SugerenciasNoDisponibles({ onRetry }: SugerenciasNoDisponiblesProps) {
    return (
        <div className={`${ANCHO_SUGERENCIAS} space-y-2 py-4`}>
            <p className="text-sm font-medium text-text-muted">
                No se pudieron cargar las sugerencias. Escribí tu consulta abajo.
            </p>

            <button
                type="button"
                onClick={onRetry}
                className="cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-bold text-text-main underline underline-offset-4 transition-colors duration-200 hover:text-agri-to focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-to/40"
            >
                Reintentar
            </button>
        </div>
    )
}
