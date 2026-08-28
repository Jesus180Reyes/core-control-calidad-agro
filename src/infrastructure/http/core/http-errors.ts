/**
 * Jerarquía de errores del cliente HTTP.
 *
 * Todo fallo que sale de `createHttpClient` es una instancia de `ErrorHttpBase`,
 * así quien llama puede discriminar sin recurrir al descarte ("si no es
 * HttpError entonces el servidor está caído"), que confundía un bug propio con
 * un problema de red.
 */

/** Raíz común de todos los errores del cliente. */
export abstract class ErrorHttpBase extends Error {}

/** El servidor respondió con un status fuera de 2xx. */
export class HttpError extends ErrorHttpBase {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** `fetch` rechazó: backend caído, CORS, DNS. No hubo respuesta. */
export class NetworkError extends ErrorHttpBase {
  constructor(
    message: string,
    public readonly causa: unknown,
  ) {
    super(message, { cause: causa })
    this.name = 'NetworkError'
  }
}

/** Venció el `timeoutMs` del cliente antes de que el servidor respondiera. */
export class TimeoutError extends ErrorHttpBase {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/** Quien llamó abortó la petición: desmontaje del componente, cambio de ruta. */
export class RequestCancelado extends ErrorHttpBase {
  constructor(message: string) {
    super(message)
    this.name = 'RequestCancelado'
  }
}

export function esHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}

export function esDeRed(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

export function esTimeout(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

export function esCancelado(error: unknown): error is RequestCancelado {
  return error instanceof RequestCancelado
}

export function esNoAutorizado(error: unknown): boolean {
  return esHttpError(error) && error.status === 401
}

export function esProhibido(error: unknown): boolean {
  return esHttpError(error) && error.status === 403
}

export function esNoEncontrado(error: unknown): boolean {
  return esHttpError(error) && error.status === 404
}

export function esValidacion(error: unknown): boolean {
  return esHttpError(error) && error.status === 422
}

/** Statuses que sí tienen sentido reintentar: el servidor pide esperar o falló. */
const STATUS_REINTENTABLES = new Set([408, 429])

/**
 * Única definición de la política de reintentos. La consume `query-client.ts`;
 * el cliente HTTP no reintenta por su cuenta.
 *
 * Un 4xx (401, 403, 404, 422) es definitivo: reintentarlo solo retrasa el error.
 */
export function esReintentable(error: unknown): boolean {
  if (esDeRed(error) || esTimeout(error)) return true
  if (!esHttpError(error)) return false
  return error.status >= 500 || STATUS_REINTENTABLES.has(error.status)
}

/**
 * Extrae el `message` que manda el backend en el body de un error.
 * Devuelve `null` si el body no lo trae o no es un string con contenido.
 */
export function mensajeDelServidor(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body as { message: unknown }
    if (typeof message === 'string' && message.length > 0) return message
  }
  return null
}
