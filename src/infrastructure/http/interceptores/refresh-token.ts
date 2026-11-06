import { BASE_URL, TIMEOUT_POR_DEFECTO_MS } from '#/infrastructure/http/core/config-http'
import { createHttpClient } from '#/infrastructure/http/core/create-http-client'
import { guardarTokens, leerRefreshToken } from '#/presentation/hooks/auth/almacenamientoSesion'
import type { RefreshResponse } from '#/presentation/types/auth/auth.types'

/**
 * Renovación del access token. Junto a `interceptores-auth.ts`, el único lugar
 * de `infrastructure/http/` que conoce la sesión.
 *
 * Contrato del SPEC 50 del backend: `POST /auth/refresh` es público y recibe el
 * refresh **sólo** en el body, `{ refreshToken }`, sin cabecera `Authorization`.
 * El backend consulta al usuario en cada llamada (borrado, inactivo o con la
 * contraseña vencida responde 401/403) y siempre rota el par, pero rotar no
 * invalida el refresh anterior: sigue valiendo hasta su vencimiento.
 *
 * Cualquier rechazo de `refrescarSesion` —también red, timeout o 5xx— lo trata
 * la fachada como sesión perdida (SPEC 25).
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

  const respuesta = await clienteRefresh.post<RefreshResponse>(ENDPOINT_REFRESH, { refreshToken })

  if (!respuesta?.accessToken) throw new Error('El refresh no devolvió un access token')

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
