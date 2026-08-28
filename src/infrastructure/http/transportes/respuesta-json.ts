import { HttpError } from '#/infrastructure/http/core/http-errors'

/**
 * Transporte por defecto: lee el cuerpo de la respuesta como JSON y lanza
 * `HttpError` fuera de 2xx. Módulo puro; no conoce la sesión ni el router.
 *
 * Comportamiento heredado tal cual del cliente anterior: un `204 No Content`
 * cae a `response.text()` y devuelve `''` casteado a `T`, y un JSON inválido en
 * un 200 devuelve `null`. Arreglarlo está fuera del alcance del SPEC 03.
 */
export async function parsearRespuesta<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text()

  if (!response.ok) {
    throw new HttpError(`${response.status} ${response.statusText}`, response.status, body)
  }

  return body as T
}
