import type { HttpClient } from '#/infrastructure/http/create-http-client'
import { esNoAutorizado } from '#/infrastructure/http/http-errors'
import { leerToken, limpiarSesion } from '#/presentation/hooks/auth/almacenamientoSesion'

/**
 * Une el cliente HTTP con la sesión. Es el único archivo de `infrastructure/http/`
 * que importa de `#/presentation` y el único que conoce la ruta `/login`:
 * `create-http-client.ts` queda reutilizable y sin dependencias hacia arriba.
 *
 * Lo activa `__root.tsx`. Sin ese import, las peticiones salen sin token y un
 * 401 deja de cerrar la sesión.
 */

/** Bandera que el interceptor de petición le deja al de error. */
const LLEVABA_TOKEN = 'llevabaToken'

const RUTA_LOGIN = '/login'

/**
 * Clientes ya cableados. Se registra por instancia y no con un booleano de
 * módulo porque el HMR de dev puede recargar uno solo de los dos archivos: con
 * un booleano, recargar `http-client.ts` dejaría al cliente nuevo sin token, y
 * recargar este archivo duplicaría el manejo del 401.
 */
const yaRegistrados = new WeakSet<HttpClient>()

export function registrarInterceptoresAuth(cliente: HttpClient): void {
  if (yaRegistrados.has(cliente)) return
  yaRegistrados.add(cliente)

  cliente.interceptores.onPeticion((ctx) => {
    // Si quien llama trajo su propio Authorization, manda el suyo.
    if (ctx.headers.has('Authorization')) return

    const token = leerToken()
    if (!token) return

    ctx.headers.set('Authorization', `Bearer ${token}`)
    ctx.meta[LLEVABA_TOKEN] = true
  })

  cliente.interceptores.onError((error, ctx) => {
    if (!esNoAutorizado(error)) return

    // Sin esta condición el propio login rebotaría con su 401 legítimo y el
    // operario nunca vería el mensaje de credenciales inválidas.
    if (ctx.meta[LLEVABA_TOKEN] !== true) return

    limpiarSesion()
    if (typeof window !== 'undefined') window.location.assign(RUTA_LOGIN)
  })
}
