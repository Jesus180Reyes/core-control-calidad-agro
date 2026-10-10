import { useEffect, useState } from 'react'

/**
 * `false` en el primer frame y `true` después. Sirve para que una transición
 * de CSS arranque desde vacío al montar (anillos y barras que se llenan).
 *
 * Doble `requestAnimationFrame`: con uno solo el cambio puede caer antes de que
 * el navegador pinte el estado inicial, y la transición no se ve.
 */
export function useHasMounted(): boolean {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        let segundo = 0
        const primero = requestAnimationFrame(() => {
            segundo = requestAnimationFrame(() => setMounted(true))
        })

        return () => {
            cancelAnimationFrame(primero)
            cancelAnimationFrame(segundo)
        }
    }, [])

    return mounted
}
