import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'

const AVISO = 'Agri está escribiendo'

/** Lo que separa el rebote de un punto del siguiente. */
const RETARDO_ENTRE_PUNTOS_MS = 160

const PUNTOS = [0, 1, 2]

/**
 * Lo que se ve mientras Agri redacta: el avatar y los tres puntos en cascada.
 *
 * A propósito no usa el `LoadingState` de la app (spinner + ícono de marca):
 * dentro de un hilo, ese loading se lee como que la conversación se está
 * cargando y no como que Agri está por contestar.
 */
export function AgriTypingIndicator() {
    return (
        <div className="flex gap-3" role="status" aria-label={AVISO}>
            <AgriAvatar />

            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-lg bg-muted/60 px-4 py-3.5">
                {PUNTOS.map((punto) => (
                    <span
                        key={punto}
                        aria-hidden
                        // El retardo va acá y no en la clase por lo mismo que en
                        // `.md-word`: es lo único que cambia entre los tres.
                        style={{ animationDelay: `${punto * RETARDO_ENTRE_PUNTOS_MS}ms` }}
                        className="agri-dot size-2 rounded-full bg-agri-to"
                    />
                ))}
            </div>

            {/* Los puntos son decorativos: sin este texto, la región queda sin
                contenido y el lector de pantalla no anuncia nada al aparecer. */}
            <span className="sr-only">{AVISO}</span>
        </div>
    )
}
