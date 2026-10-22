import { useEffect } from 'react'

/**
 * Mantiene la pantalla encendida mientras `active` es `true`, con la Wake Lock
 * API: sin esto, el televisor del modo TV entra en reposo a los pocos minutos.
 *
 * El navegador suelta el lock al ocultar la pestaña, así que se vuelve a pedir
 * al volver a ella. Sin la API, o si el navegador rechaza el pedido (ahorro de
 * batería, política del equipo), se ignora en silencio, igual que la pantalla
 * completa en `useFullscreen`.
 */
export function useWakeLock(active: boolean) {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return

        let cancelado = false
        let lock: WakeLockSentinel | null = null
        // Un solo pedido en vuelo: dos locks a la vez dejarían uno sin soltar.
        let pidiendo = false

        const pedir = () => {
            if (pidiendo || (lock && !lock.released)) return
            pidiendo = true
            navigator.wakeLock.request('screen')
                .then((l) => {
                    // Pudo llegar después de desactivarse: se suelta enseguida.
                    if (cancelado) void l.release().catch(() => { })
                    else lock = l
                })
                .catch(() => { })
                .finally(() => { pidiendo = false })
        }

        const alCambiarVisibilidad = () => { if (document.visibilityState === 'visible') pedir() }

        pedir()
        document.addEventListener('visibilitychange', alCambiarVisibilidad)
        return () => {
            cancelado = true
            document.removeEventListener('visibilitychange', alCambiarVisibilidad)
            void lock?.release().catch(() => { })
        }
    }, [active])
}
