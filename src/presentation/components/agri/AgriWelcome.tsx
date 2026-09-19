import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'
import { useAuth } from '#/presentation/hooks/auth/useAuth'

/**
 * Los cuatro arranques que ofrece la pantalla vacía. Son del rubro a propósito:
 * un chat que abre con "¿En qué puedo ayudarte?" y nada más deja al operario
 * sin saber qué se le puede preguntar.
 */
const PROMPTS_SUGERIDOS = [
    '¿Qué reviso antes de aprobar un lote?',
    '¿Cómo interpreto un pesaje rechazado?',
    'Explicame la diferencia entre peso bruto, tara y neto.',
    '¿Qué humedad es aceptable para exportación?',
]

const ESTILOS_GRADIENTE = 'bg-linear-to-r from-agri-from to-agri-to bg-clip-text text-transparent'

interface AgriWelcomeProps {
    onSend: (content: string) => void
}

/**
 * La pantalla vacía del chat: lo que se ve antes del primer mensaje y lo que
 * vuelve a verse al tocar "Nueva conversación".
 */
export function AgriWelcome({ onSend }: AgriWelcomeProps) {
    const { usuario } = useAuth()

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

            <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {PROMPTS_SUGERIDOS.map((prompt, indice) => (
                    <button
                        key={prompt}
                        type="button"
                        onClick={() => onSend(prompt)}
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
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    )
}
