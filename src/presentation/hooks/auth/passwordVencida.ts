import { esHttpError, esProhibido } from '#/infrastructure/http/core/http-errors'

/**
 * ¿El login respondió el 403 de contraseña vencida (SPEC 33 del backend)?
 *
 * Hace falta el status **y** la marca del cuerpo: un 403 por cualquier otro
 * motivo sigue el camino de siempre y se pinta en el banner del login.
 *
 * Vive acá y no en `infrastructure/http/core/` porque `core/` no conoce el
 * dominio: `passwordVencida` es una clave del contrato de `/auth/login`.
 */
export function isExpiredPasswordError(error: unknown): boolean {
    if (!esProhibido(error) || !esHttpError(error)) return false

    const { body } = error
    return (
        typeof body === 'object' &&
        body !== null &&
        (body as { passwordVencida?: unknown }).passwordVencida === true
    )
}
