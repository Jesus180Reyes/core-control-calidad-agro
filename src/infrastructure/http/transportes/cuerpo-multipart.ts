/**
 * Armado del cuerpo multipart. Módulo puro: no importa nada.
 *
 * El `Content-Type` no se toca acá ni en ningún lado: `create-http-client.ts`
 * lo omite cuando el body es un `FormData`, para que el navegador ponga el
 * `boundary` él mismo. Fijarlo a mano rompe la petición.
 */

/**
 * Convierte un objeto plano en `FormData`.
 *
 * - `File` y `Blob` se anexan tal cual, que es el punto de todo esto.
 * - Cualquier otro objeto va como JSON: es lo que espera un backend que recibe
 *   campos anidados junto a los archivos.
 * - El resto se serializa con `String(valor)`.
 * - `undefined` y `null` **omiten la clave**, igual que en `query-params.ts`.
 *   El template los mandaba como los strings `"undefined"` y `"null"`, que del
 *   otro lado llegan como valores presentes.
 */
export function aFormData(objeto: Record<string, unknown>): FormData {
  const formData = new FormData()

  for (const [clave, valor] of Object.entries(objeto)) {
    if (valor === undefined || valor === null) continue

    if (valor instanceof File || valor instanceof Blob) {
      formData.append(clave, valor)
      continue
    }

    if (typeof valor === 'object') {
      formData.append(clave, JSON.stringify(valor))
      continue
    }

    formData.append(clave, String(valor))
  }

  return formData
}
