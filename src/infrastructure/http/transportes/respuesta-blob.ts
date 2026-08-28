import { HttpError } from '#/infrastructure/http/core/http-errors'

/**
 * Transporte binario: lee el cuerpo como `Blob`. Es el que necesita un PDF, una
 * imagen o cualquier descarga. Módulo puro; no conoce la sesión ni el router.
 */

/** El error igual viene en JSON o en texto: se parsea para que `mensajeDelServidor` lo lea. */
async function leerCuerpoDeError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  return contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)
}

export async function parsearRespuestaBlob(response: Response): Promise<Blob> {
  if (!response.ok) {
    throw new HttpError(
      `${response.status} ${response.statusText}`,
      response.status,
      await leerCuerpoDeError(response),
    )
  }

  // Un 2xx con JSON en una petición binaria es el backend contestando un error
  // sin cambiar el status. Sin esta rama, el front descarga un "PDF" que en
  // realidad es un mensaje de error.
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    throw new HttpError(
      `${response.status} respondió JSON en vez del binario esperado`,
      response.status,
      await response.json().catch(() => null),
    )
  }

  return await response.blob()
}
