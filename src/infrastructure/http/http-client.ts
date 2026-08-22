import { createHttpClient } from '#/infrastructure/http/create-http-client'
import { registrarInterceptoresAuth } from '#/infrastructure/http/interceptores-auth'

/**
 * Instancia única del cliente HTTP de la app, ya cableada a la sesión.
 *
 * El registro de los interceptores vive acá, junto a la creación: así la
 * instancia no puede existir sin token ni sin el manejo del 401, y nadie tiene
 * que acordarse de encenderla desde otro archivo.
 *
 * `createHttpClient` queda disponible para instanciar un cliente contra **otro**
 * API. Ese cliente no lleva los interceptores de auth: hay que registrárselos a
 * mano si los necesita.
 */
export const api = createHttpClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  timeoutMs: 15_000,
})

registrarInterceptoresAuth(api)

export const httpRequest = api.request
export const httpGet = api.get
export const httpPost = api.post
export const httpPut = api.put
export const httpPatch = api.patch
export const httpDelete = api.delete

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
} from '#/infrastructure/http/http-errors'

export { createHttpClient } from '#/infrastructure/http/create-http-client'

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
} from '#/infrastructure/http/create-http-client'

export type { QueryParams, ValorParam } from '#/infrastructure/http/query-params'
