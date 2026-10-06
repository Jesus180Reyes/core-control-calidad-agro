import { useCallback, useState } from 'react'

/**
 * Un booleano que se acuerda entre recargas, en `localStorage`. Sólo para
 * comodidades del navegador (un panel plegado): si el almacenamiento no está
 * disponible, funciona igual y simplemente no se acuerda.
 */
export function usePersistentFlag(key: string, initial = false): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState(() => {
        try {
            const guardado = localStorage.getItem(key)
            return guardado === null ? initial : guardado === '1'
        } catch {
            return initial
        }
    })

    const update = useCallback((next: boolean) => {
        setValue(next)
        try { localStorage.setItem(key, next ? '1' : '0') } catch { /* sin almacenamiento: no se recuerda */ }
    }, [key])

    return [value, update]
}
