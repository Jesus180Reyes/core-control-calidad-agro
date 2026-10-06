import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * Pantalla completa de un elemento con la Fullscreen API, pensada para dejar el
 * tablero fijo en un televisor de planta. `supported` es `false` donde el
 * navegador no la ofrece (Safari del iPhone): ahí el botón no se pinta.
 *
 * El estado sale del evento `fullscreenchange` y no del click, porque también se
 * sale con Esc o con el gesto del sistema, sin pasar por el botón.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
    const [active, setActive] = useState(false)
    const [supported, setSupported] = useState(false)

    useEffect(() => {
        setSupported(document.fullscreenEnabled)
        const alCambiar = () => setActive(document.fullscreenElement !== null && document.fullscreenElement === ref.current)
        document.addEventListener('fullscreenchange', alCambiar)
        return () => document.removeEventListener('fullscreenchange', alCambiar)
    }, [ref])

    const toggle = useCallback(() => {
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => { /* ya había salido */ })
            return
        }
        // Puede rechazarse (sin gesto del usuario, política del navegador): no es un fallo que avisar.
        void ref.current?.requestFullscreen().catch(() => {})
    }, [ref])

    return { active, supported, toggle }
}
