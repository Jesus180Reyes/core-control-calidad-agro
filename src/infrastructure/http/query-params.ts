/**
 * Armado de URLs del cliente HTTP. Módulo puro: no importa nada.
 */

export type ValorParamSimple = string | number | boolean | Date

export type ValorParam = ValorParamSimple | ValorParamSimple[] | null | undefined

export type QueryParams = Record<string, ValorParam>

/**
 * Serializa un valor simple. Las fechas van en ISO porque es el único formato
 * que un backend puede parsear sin conocer la zona horaria del navegador.
 */
function serializarValor(valor: ValorParamSimple): string {
  return valor instanceof Date ? valor.toISOString() : String(valor)
}

/**
 * Construye el query string **sin** el `?` inicial. Devuelve `''` si no hay
 * nada que mandar.
 *
 * Reglas:
 * - `undefined`, `null` y los arrays vacíos omiten la clave.
 * - `''` se envía como `clave=`: un filtro de texto vacío es un valor legítimo
 *   y distinto de "no filtrar".
 * - Un array repite la clave (`ids=1&ids=2`), que es lo que interpretan Express
 *   y NestJS. `String([1, 2])` daría `ids=1,2`, que obliga a un split del otro lado.
 */
export function construirQueryString(params?: QueryParams): string {
  if (!params) return ''

  const query = new URLSearchParams()

  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null) continue

    if (Array.isArray(valor)) {
      for (const item of valor) {
        if (item === undefined || item === null) continue
        query.append(clave, serializarValor(item))
      }
      continue
    }

    query.append(clave, serializarValor(valor))
  }

  return query.toString()
}

const ES_ABSOLUTA = /^https?:\/\//i

/**
 * Une la base del cliente con el endpoint de la llamada.
 *
 * Un endpoint absoluto (`https://otro-host/api/x`) ignora `baseUrl`: permite
 * pegarle a un endpoint suelto de otro host sin instanciar un cliente entero.
 *
 * La barra intermedia se normaliza: `http://x:4000/` + `/auth` no produce
 * `http://x:4000//auth`. Con `baseUrl` vacía el resultado queda relativo a la
 * raíz del origen (`/auth`), no al path actual.
 */
export function unirUrl(baseUrl: string, endpoint: string): string {
  if (ES_ABSOLUTA.test(endpoint)) return endpoint

  const base = baseUrl.replace(/\/+$/, '')
  const ruta = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  return `${base}${ruta}`
}

/** URL final: base + endpoint + query string. */
export function construirUrl(baseUrl: string, endpoint: string, params?: QueryParams): string {
  const url = unirUrl(baseUrl, endpoint)
  const query = construirQueryString(params)

  return query ? `${url}?${query}` : url
}
