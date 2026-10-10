import { esHttpError, esSolicitudInvalida } from '#/infrastructure/http/core/http-errors'

/**
 * Los textos exactos con que `POST /pesajes` rechaza el `autorizacion_token`
 * (SPEC 38 del backend). Si cambian allá, se tocan acá: el caso cae al
 * comportamiento de cualquier otro 400.
 */
const MENSAJES_AUTORIZACION_INVALIDA: ReadonlySet<string> = new Set([
    'La autorizacion no existe',
    'La autorizacion ya fue utilizada',
])

/**
 * ¿El guardado se rechazó por el token del supervisor?
 *
 * Hace falta el status **y** el texto: un 400 de `POST /pesajes` también puede
 * ser un lote cerrado o una tara inválida, y solo el de token tiene que
 * volver a pedir el PIN.
 */
export function isInvalidAuthorizationError(error: unknown): boolean {
    return esSolicitudInvalida(error) && esHttpError(error) && MENSAJES_AUTORIZACION_INVALIDA.has(error.message)
}
