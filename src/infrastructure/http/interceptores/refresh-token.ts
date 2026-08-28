import { BASE_URL, TIMEOUT_POR_DEFECTO_MS } from '#/infrastructure/http/core/config-http'
import { createHttpClient } from '#/infrastructure/http/core/create-http-client'
import { guardarTokens, leerRefreshToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import type { RefreshResponse } from '#/presentation/types/auth/auth.types'

/**
 * Renovación del access token. Junto a `interceptores-auth.ts`, el único lugar
 * de `infrastructure/http/` que conoce la sesión.
 *
 * El endpoint todavía no existe del lado del backend (ver SPEC 06): hasta que
 * exista, `refrescarSesion` rechaza y la fachada degrada al cierre de sesión de
 * siempre.
 */

const ENDPOINT_REFRESH = '/auth/refresh'

/**
 * Cliente propio, **sin** los interceptores de auth. Si el refresh saliera por
 * `api`, su propio 401 dispararía otro refresh, que dispararía otro.
 */
const clienteRefresh = createHttpClient({
  baseUrl: BASE_URL,
  timeoutMs: TIMEOUT_POR_DEFECTO_MS,
})

/**
 * Refresh en vuelo. Su existencia **es** la bandera: dos peticiones que reciben
 * 401 al mismo tiempo comparten esta promesa y el backend ve un solo POST.
 */
let refrescoEnVuelo: Promise<string> | null = null

/** Permite a la fachada decidir sin capturar una excepción. */
export function hayRefreshToken(): boolean {
  return leerRefreshToken() !== null
}

async function pedirTokensNuevos(): Promise<string> {
  const refreshToken = leerRefreshToken()
  if (!refreshToken) throw new Error('No hay refresh token guardado')

  const respuesta = await clienteRefresh.post<RefreshResponse>(
    ENDPOINT_REFRESH,
    { refreshToken },
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  )

  if (!respuesta?.accessToken) throw new Error('El refresh no devolvió un access token')

  // Sin `refreshToken` en la respuesta se conserva el actual: cubre a un
  // backend que emita el access nuevo sin rotar el refresh.
  guardarTokens(respuesta)

  return respuesta.accessToken
}

/**
 * Renueva el access token y devuelve el nuevo. Single-flight: mientras haya uno
 * en vuelo, todas las llamadas esperan la misma promesa.
 */
export function refrescarSesion(): Promise<string> {
  if (refrescoEnVuelo) return refrescoEnVuelo

  // El `finally` libera la bandera tanto si salió bien como si falló: si no,
  // un refresh fallido dejaría la promesa rechazada cacheada para siempre.
  refrescoEnVuelo = pedirTokensNuevos().finally(() => {
    refrescoEnVuelo = null
  })

  return refrescoEnVuelo
}
