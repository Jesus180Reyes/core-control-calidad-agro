import { cn } from '#/lib/utils'

/**
 * Las dos medidas en que se usa el avatar: la chica en la burbuja, el header y
 * el Sidebar; la grande, en la bienvenida y en la portada. `--agri-look` es
 * cuánto se corre la cara al mirar a un costado: en px, porque en la chica un
 * porcentaje de un ojo de 3 px redondea a nada.
 */
const MEDIDAS = {
    sm: {
        caja: 'size-8',
        cara: 'gap-px [--agri-look:2px]',
        ojos: 'gap-[5px]',
        ojo: 'w-[3px] h-[7px]',
        boca: 'w-[7px] h-[3px] border-b-[1.5px]',
    },
    lg: {
        caja: 'size-14',
        cara: 'gap-0.5 [--agri-look:3px]',
        ojos: 'gap-2.5',
        ojo: 'w-[5px] h-3',
        boca: 'w-3 h-[5px] border-b-2',
    },
} as const

/**
 * Cada ojo tiene su propia animación porque no hacen siempre lo mismo: en el
 * guiño sólo cierra el derecho. Mientras piensa, los dos sólo parpadean.
 */
const OJOS = ['agri-eye-l', 'agri-eye-r'] as const

interface AgriAvatarProps {
    /** @default 'sm' */
    size?: keyof typeof MEDIDAS
    /**
     * Mientras Agri redacta, mira hacia arriba de un lado al otro y el brillo
     * gira más rápido: es lo que hace que el avatar del indicador se lea
     * "pensando".
     */
    thinking?: boolean
    /**
     * Cara neutra y quieta. Para las respuestas viejas del hilo: diez caras
     * guiñando a la vez —las animaciones van sincronizadas— distraen de leer.
     */
    still?: boolean
    className?: string
}

/**
 * La cara de Agri: un orbe con el gradiente propio del chat IA, un brillo que
 * gira despacio adentro y una cara con expresiones. En reposo recorre un ciclo
 * de 12 s —parpadea, mira a los costados, sonríe, guiña, parpadea dos veces—
 * escrito en `styles.css` (`agri-look`, `agri-eye-*`, `agri-smile`): las cuatro
 * animaciones duran lo mismo, y eso es lo que las mantiene sincronizadas.
 *
 * Es el único lugar de la app donde viven `agri-from` y `agri-to` además del
 * botón de enviar: si el gradiente cambia, cambia acá.
 */
export function AgriAvatar({ size = 'sm', thinking = false, still = false, className }: AgriAvatarProps) {
    const medida = MEDIDAS[size]
    const animado = !still

    return (
        <span
            aria-hidden
            className={cn(
                'relative shrink-0 grid place-items-center overflow-hidden rounded-full',
                'bg-linear-to-br from-agri-from to-agri-to',
                // El anillo interior es lo que despega el orbe del fondo en modo
                // oscuro, donde el gradiente y la superficie se acercan.
                'ring-1 ring-inset ring-white/25 shadow-clay-btn',
                medida.caja,
                className,
            )}
        >
            {/* El brillo que gira: un barrido cónico que da la sensación de que
                el orbe está vivo sin cambiar su color. */}
            <span
                className={cn(
                    'absolute inset-0 bg-conic from-transparent via-white/35 to-transparent blur-[2px]',
                    animado && 'agri-swirl',
                    thinking && 'animation-duration-[3s]',
                )}
            />

            {/* El reflejo fijo arriba a la izquierda, que le da volumen. */}
            <span className="absolute inset-0 bg-radial-[at_30%_25%] from-white/45 to-transparent to-60%" />

            <span
                className={cn(
                    'relative flex flex-col items-center',
                    medida.cara,
                    animado && (thinking ? 'agri-think' : 'agri-look'),
                )}
            >
                <span className={cn('flex items-center', medida.ojos)}>
                    {OJOS.map((animacion) => (
                        <span
                            key={animacion}
                            className={cn(
                                'rounded-full bg-white shadow-[0_0_4px_rgb(255_255_255/0.6)]',
                                animado && (thinking ? 'agri-blink' : animacion),
                                medida.ojo,
                            )}
                        />
                    ))}
                </span>

                {/* La sonrisa: invisible salvo en su tramo del ciclo. Pensando
                    no aparece, porque el `opacity-0` es su estado base. */}
                <span
                    className={cn(
                        'block rounded-b-full border-white opacity-0',
                        animado && !thinking && 'agri-smile',
                        medida.boca,
                    )}
                />
            </span>
        </span>
    )
}
