import {
  ErrorHttpBase,
  NetworkError,
  RequestCancelado,
  TimeoutError,
} from '#/infrastructure/http/core/http-errors'
import { construirUrl, type QueryParams } from '#/infrastructure/http/core/query-params'
import { parsearRespuestaBlob } from '#/infrastructure/http/transportes/respuesta-blob'
import { parsearRespuesta } from '#/infrastructure/http/transportes/respuesta-json'

/**
 * Cliente HTTP instanciable. Este módulo no conoce la sesión, el router ni
 * ninguna ruta de la app: todo eso entra por interceptores registrados desde
 * fuera (ver `interceptores-auth.ts`).
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Qué transporte lee el cuerpo de la respuesta. Es una opción y no una función
 * aparte para que el binario comparta el timeout, el signal, los interceptores
 * y la traducción de errores con el resto: duplicar todo eso por transporte es
 * lo que llevaba al template a repetir el mismo `fetch` en cinco archivos.
 */
export type TipoDeParseo = 'json' | 'blob'

export interface HttpClientConfig {
  baseUrl?: string
  /** @default 15000 */
  timeoutMs?: number
  /** Headers aplicados a toda petición; los de la llamada tienen prioridad. */
  headers?: HeadersInit
  credentials?: RequestCredentials
  /** Inyectable para tests o para un fetch instrumentado. @default globalThis.fetch */
  fetch?: typeof fetch
}

export interface HttpRequestOptions {
  method: HttpMethod
  body?: unknown
  params?: QueryParams
  headers?: HeadersInit
  signal?: AbortSignal
  /** Sobreescribe el timeout del cliente. `0` lo desactiva para esta petición. */
  timeoutMs?: number
  /** Cómo leer el cuerpo de la respuesta. @default 'json' */
  parsear?: TipoDeParseo
  /** Valores iniciales de `ContextoPeticion.meta`. */
  meta?: Record<string, unknown>
}

export type QueryRequestOptions = Omit<HttpRequestOptions, 'method' | 'body'>
export type MutationRequestOptions = Omit<HttpRequestOptions, 'method' | 'body' | 'params'>

/** Lo que ven los interceptores. `headers` y `meta` son mutables a propósito. */
export interface ContextoPeticion {
  /** URL final, ya con baseUrl y query string. */
  url: string
  method: HttpMethod
  headers: Headers
  body: BodyInit | undefined
  signal: AbortSignal
  /** Endpoint crudo, tal como lo pasó quien llamó. Útil para logs. */
  endpoint: string
  /** Bolsa libre para que los interceptores se pasen banderas entre sí. */
  meta: Record<string, unknown>
}

export type InterceptorPeticion = (ctx: ContextoPeticion) => void | Promise<void>
export type InterceptorRespuesta = (respuesta: Response, ctx: ContextoPeticion) => void | Promise<void>
export type InterceptorError = (error: ErrorHttpBase, ctx: ContextoPeticion) => void | Promise<void>

export interface RegistroInterceptores {
  /** Cada registro devuelve su función de baja. */
  onPeticion(fn: InterceptorPeticion): () => void
  onRespuesta(fn: InterceptorRespuesta): () => void
  onError(fn: InterceptorError): () => void
}

export interface HttpClient {
  request<T>(endpoint: string, options: HttpRequestOptions): Promise<T>
  get<T>(endpoint: string, options?: QueryRequestOptions): Promise<T>
  post<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T>
  put<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T>
  patch<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T>
  delete<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T>
  interceptores: RegistroInterceptores
}

const TIMEOUT_POR_DEFECTO = 15_000

/**
 * Razón de aborto propia. Comparar por identidad es lo que permite distinguir
 * un timeout de una cancelación de quien llama, sin inspeccionar el mensaje de
 * la `DOMException`.
 */
const RAZON_TIMEOUT = Symbol('http-timeout')

export function createHttpClient(config: HttpClientConfig = {}): HttpClient {
  const {
    baseUrl = '',
    timeoutMs: timeoutPorDefecto = TIMEOUT_POR_DEFECTO,
    headers: headersPorDefecto,
    credentials,
    fetch: fetchInyectado,
  } = config

  const interceptoresPeticion = new Set<InterceptorPeticion>()
  const interceptoresRespuesta = new Set<InterceptorRespuesta>()
  const interceptoresError = new Set<InterceptorError>()

  function armarHeaders(headers: HeadersInit | undefined, esFormData: boolean): Headers {
    const cabeceras = new Headers(headersPorDefecto)

    // Con FormData el navegador tiene que poner el boundary él mismo.
    if (!esFormData) cabeceras.set('Content-Type', 'application/json')

    // Los headers de la llamada pisan a los del cliente.
    new Headers(headers).forEach((valor, clave) => cabeceras.set(clave, valor))

    return cabeceras
  }

  /**
   * Traduce el rechazo de `fetch`. Un aborto puede venir del temporizador o de
   * quien llamó, y son dos errores distintos para quien los recibe.
   */
  function traducirFallo(causa: unknown, signal: AbortSignal, timeoutMs: number): ErrorHttpBase {
    if (signal.aborted) {
      return signal.reason === RAZON_TIMEOUT
        ? new TimeoutError(`La petición superó el tiempo de espera de ${timeoutMs} ms`, timeoutMs)
        : new RequestCancelado('La petición fue cancelada')
    }

    return new NetworkError('No se pudo contactar al servidor', causa)
  }

  async function notificarError(error: ErrorHttpBase, ctx: ContextoPeticion): Promise<void> {
    for (const interceptor of interceptoresError) await interceptor(error, ctx)
  }

  async function request<T>(endpoint: string, options: HttpRequestOptions): Promise<T> {
    const {
      method,
      body,
      params,
      headers,
      signal: signalExterno,
      timeoutMs = timeoutPorDefecto,
      parsear = 'json',
      meta,
    } = options

    const esFormData = body instanceof FormData
    const ejecutarFetch = fetchInyectado ?? globalThis.fetch

    const controlador = new AbortController()
    const abortarPorExterno = () => controlador.abort(signalExterno?.reason)

    let temporizador: ReturnType<typeof setTimeout> | undefined

    if (signalExterno) {
      if (signalExterno.aborted) controlador.abort(signalExterno.reason)
      else signalExterno.addEventListener('abort', abortarPorExterno, { once: true })
    }

    if (timeoutMs > 0) {
      temporizador = setTimeout(() => controlador.abort(RAZON_TIMEOUT), timeoutMs)
    }

    const ctx: ContextoPeticion = {
      url: construirUrl(baseUrl, endpoint, params),
      method,
      headers: armarHeaders(headers, esFormData),
      body: esFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
      endpoint,
      meta: { ...meta },
    }

    try {
      for (const interceptor of interceptoresPeticion) await interceptor(ctx)

      let respuesta: Response
      try {
        respuesta = await ejecutarFetch(ctx.url, {
          method: ctx.method,
          headers: ctx.headers,
          body: ctx.body,
          signal: ctx.signal,
          credentials,
        })
      } catch (causa) {
        throw traducirFallo(causa, controlador.signal, timeoutMs)
      }

      for (const interceptor of interceptoresRespuesta) await interceptor(respuesta, ctx)

      if (parsear === 'blob') return (await parsearRespuestaBlob(respuesta)) as T

      return await parsearRespuesta<T>(respuesta)
    } catch (error) {
      // Los interceptores observan y reaccionan; nunca se tragan el error ni
      // pueden devolver una respuesta falsa en su lugar.
      if (error instanceof ErrorHttpBase) await notificarError(error, ctx)
      throw error
    } finally {
      clearTimeout(temporizador)
      signalExterno?.removeEventListener('abort', abortarPorExterno)
    }
  }

  return {
    request,
    get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
    post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
    put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
    patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
    delete: (endpoint, body, options) => request(endpoint, { method: 'DELETE', body, ...options }),
    interceptores: {
      onPeticion(fn) {
        interceptoresPeticion.add(fn)
        return () => interceptoresPeticion.delete(fn)
      },
      onRespuesta(fn) {
        interceptoresRespuesta.add(fn)
        return () => interceptoresRespuesta.delete(fn)
      },
      onError(fn) {
        interceptoresError.add(fn)
        return () => interceptoresError.delete(fn)
      },
    },
  }
}
