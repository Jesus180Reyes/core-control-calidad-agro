import { BASE_URL, TIMEOUT_POR_DEFECTO_MS } from '#/infrastructure/http/core/config-http'
import {
  createHttpClient,
  type HttpRequestOptions,
  type MutationRequestOptions,
  type QueryRequestOptions,
} from '#/infrastructure/http/core/create-http-client'
import { esNoAutorizado } from '#/infrastructure/http/core/http-errors'
import {
  cerrarSesionYSalir,
  peticionLlevaToken,
  registrarInterceptoresAuth,
} from '#/infrastructure/http/interceptores/interceptores-auth'
import { hayRefreshToken, refrescarSesion } from '#/infrastructure/http/interceptores/refresh-token'

/**
 * Fachada pública del cliente HTTP: la instancia única de la app, la política
 * del 401 y los atajos que usa el resto del proyecto.
 *
 * El registro de los interceptores vive acá, junto a la creación: así la
 * instancia no puede existir sin token, y nadie tiene que acordarse de
 * encenderla desde otro archivo.
 *
 * `createHttpClient` queda disponible para instanciar un cliente contra **otro**
 * API. Ese cliente no lleva los interceptores de auth ni el refresh: hay que
 * registrárselos a mano si los necesita.
 */

/**
 * Cliente crudo, **sin** refresh ni reintento. Expuesto para casos sueltos que
 * necesiten el 401 tal cual llega. Lo normal es usar los atajos de abajo.
 */
export const api = createHttpClient({
  baseUrl: BASE_URL,
  timeoutMs: TIMEOUT_POR_DEFECTO_MS,
})

registrarInterceptoresAuth(api)

/**
 * Punto único de entrada de toda petición de la app.
 *
 * Ante un 401 de una petición autenticada por la sesión: renueva el access
 * token y reintenta **una sola vez**. Si el refresh falla —o no hay refresh
 * token, que es el estado de hoy— cierra sesión y manda a `/login`.
 *
 * El reintento vive acá y no en `create-http-client.ts` a propósito: ese módulo
 * declara que sus interceptores observan pero nunca cortocircuitan, y así sigue
 * siendo instanciable contra otro API sin arrastrar el refresh.
 */
export async function httpRequest<T>(endpoint: string, options: HttpRequestOptions): Promise<T> {
  try {
    return await api.request<T>(endpoint, options)
  } catch (error) {
    if (!esNoAutorizado(error)) throw error

    // Sin esta condición el propio login rebotaría con su 401 legítimo y el
    // operario nunca vería el mensaje de credenciales inválidas.
    if (!peticionLlevaToken(options.headers)) throw error

    if (!hayRefreshToken()) {
      cerrarSesionYSalir()
      throw error
    }

    try {
      await refrescarSesion()
    } catch {
      // Quien llamó recibe el 401 original: le importa que su petición falló,
      // no la mecánica interna de la renovación.
      cerrarSesionYSalir()
      throw error
    }

    // El reintento vuelve a pasar por `onPeticion`, que relee el token y por lo
    // tanto inyecta el nuevo. Un 401 acá sale como error: no hay segundo refresh.
    return await api.request<T>(endpoint, options)
  }
}

// Construidos sobre `httpRequest`, no sobre `api`: apuntando a `api.get` las
// queries se quedarían sin refresh.
export const httpGet = <T,>(endpoint: string, options?: QueryRequestOptions) =>
  httpRequest<T>(endpoint, { method: 'GET', ...options })

export const httpPost = <T,>(endpoint: string, body?: unknown, options?: MutationRequestOptions) =>
  httpRequest<T>(endpoint, { method: 'POST', body, ...options })

export const httpPut = <T,>(endpoint: string, body?: unknown, options?: MutationRequestOptions) =>
  httpRequest<T>(endpoint, { method: 'PUT', body, ...options })

export const httpPatch = <T,>(endpoint: string, body?: unknown, options?: MutationRequestOptions) =>
  httpRequest<T>(endpoint, { method: 'PATCH', body, ...options })

export const httpDelete = <T,>(endpoint: string, body?: unknown, options?: MutationRequestOptions) =>
  httpRequest<T>(endpoint, { method: 'DELETE', body, ...options })

export {
  ErrorHttpBase,
  HttpError,
  NetworkError,
  RequestCancelado,
  TimeoutError,
  esCancelado,
  esDeRed,
  esHttpError,
  esNoAutorizado,
  esNoEncontrado,
  esProhibido,
  esReintentable,
  esTimeout,
  esValidacion,
  mensajeDelServidor,
} from '#/infrastructure/http/core/http-errors'

export type { ErrorValidacion } from '#/infrastructure/http/core/http-errors'

export { createHttpClient } from '#/infrastructure/http/core/create-http-client'

export type {
  ContextoPeticion,
  HttpClient,
  HttpClientConfig,
  HttpMethod,
  HttpRequestOptions,
  InterceptorError,
  InterceptorPeticion,
  InterceptorRespuesta,
  MutationRequestOptions,
  QueryRequestOptions,
  TipoDeParseo,
} from '#/infrastructure/http/core/create-http-client'

export type { QueryParams, ValorParam } from '#/infrastructure/http/core/query-params'
