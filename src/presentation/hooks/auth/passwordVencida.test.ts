import { describe, expect, it } from 'vitest'

import { isExpiredPasswordError } from './passwordVencida'
import { HttpError, NetworkError } from '#/infrastructure/http/core/http-errors'

describe('isExpiredPasswordError', () => {
    it('reconoce el 403 con passwordVencida: true', () => {
        const error = new HttpError('403 Forbidden', 403, {
            statusCode: 403,
            message: 'La contraseña ha caducado',
            passwordVencida: true,
        })

        expect(isExpiredPasswordError(error)).toBe(true)
    })

    it('descarta un 403 sin la clave passwordVencida', () => {
        const error = new HttpError('403 Forbidden', 403, {
            statusCode: 403,
            message: 'No tiene permiso',
        })

        expect(isExpiredPasswordError(error)).toBe(false)
    })

    it('descarta un 403 con passwordVencida: false', () => {
        const error = new HttpError('403 Forbidden', 403, { passwordVencida: false })

        expect(isExpiredPasswordError(error)).toBe(false)
    })

    it('descarta un 401', () => {
        const error = new HttpError('401 Unauthorized', 401, {
            message: 'Usuario o contraseña incorrectos',
        })

        expect(isExpiredPasswordError(error)).toBe(false)
    })

    it('descarta un NetworkError', () => {
        const error = new NetworkError('Sin conexión', new TypeError('Failed to fetch'))

        expect(isExpiredPasswordError(error)).toBe(false)
    })

    it('descarta un Error cualquiera', () => {
        expect(isExpiredPasswordError(new Error('passwordVencida'))).toBe(false)
    })
})
