import { useEffect, useState } from 'react'

import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'

const AVISO = 'Agri está escribiendo'

/** Lo que separa el rebote de un punto del siguiente. */
const RETARDO_ENTRE_PUNTOS_MS = 160

const PUNTOS = [0, 1, 2]

/**
 * Lo que se suma a los puntos cuando la espera se alarga. Una respuesta que
 * consulta varias funciones del backend puede tardar, y tres puntos que no
 * cambian durante medio minuto se leen como un chat colgado.
 */
const AVISOS_DE_ESPERA = [
    { desdeMs: 8_000, texto: 'Consultando los datos de la planta…' },
    { desdeMs: 25_000, texto: 'Está tardando más de lo normal. Podés detenerla con el botón de abajo.' },
]

/**
 * Lo que se ve mientras Agri redacta: el avatar y los tres puntos en cascada.
 *
 * A propósito no usa el `LoadingState` de la app (spinner + ícono de marca):
 * dentro de un hilo, ese loading se lee como que la conversación se está
 * cargando y no como que Agri está por contestar.
 *
 * Se monta sólo con un turno en vuelo, así que el tiempo de espera arranca de
 * cero en cada pregunta sin tener que reiniciarlo a mano.
 */
export function AgriTypingIndicator() {
    const [aviso, setAviso] = useState<string | null>(null)

    useEffect(() => {
        const timers = AVISOS_DE_ESPERA.map(({ desdeMs, texto }) =>
            setTimeout(() => setAviso(texto), desdeMs),
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <div className="flex gap-3" role="status" aria-label={AVISO}>
            <AgriAvatar thinking />

            <div className="flex min-w-0 flex-col items-start gap-1.5">
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

                {/* La `key` es el texto para que cada aviso nuevo vuelva a
                    entrar con el fundido, en vez de cambiar de golpe. */}
                {aviso !== null && (
                    <p key={aviso} className="text-xs font-medium text-text-muted animate-in fade-in duration-500">
                        {aviso}
                    </p>
                )}
            </div>

            {/* Los puntos son decorativos: sin este texto, la región queda sin
                contenido y el lector de pantalla no anuncia nada al aparecer. */}
            <span className="sr-only">{AVISO}</span>
        </div>
    )
}
