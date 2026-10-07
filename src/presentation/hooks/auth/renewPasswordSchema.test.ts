import { describe, expect, it } from 'vitest'

import { RENEW_PASSWORD_MESSAGES, createRenewPasswordSchema } from './renewPasswordSchema'

const ACTUAL = 'Vieja2025'
const schema = createRenewPasswordSchema(ACTUAL)

/** Los mensajes de error del intento, sin importar el campo. */
function mensajes(password_nueva: string, confirmacion = password_nueva): string[] {
    const resultado = schema.safeParse({ password_nueva, confirmacion })
    return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message)
}

describe('createRenewPasswordSchema', () => {
    it('acepta una contraseña que cumple todas las reglas', () => {
        expect(mensajes('Nueva2026')).toEqual([])
    })

    it('pide al menos 8 caracteres', () => {
        expect(mensajes('Nue2026')).toEqual([RENEW_PASSWORD_MESSAGES.minLength])
    })

    it('pide al menos una mayúscula', () => {
        expect(mensajes('nueva2026')).toEqual([RENEW_PASSWORD_MESSAGES.uppercase])
    })

    it('pide al menos un número', () => {
        expect(mensajes('NuevaClave')).toEqual([RENEW_PASSWORD_MESSAGES.number])
    })

    it('rechaza la misma contraseña del login', () => {
        expect(mensajes(ACTUAL)).toEqual([RENEW_PASSWORD_MESSAGES.different])
    })

    it('rechaza una confirmación que no coincide', () => {
        const resultado = schema.safeParse({ password_nueva: 'Nueva2026', confirmacion: 'Nueva2027' })

        expect(resultado.success).toBe(false)
        expect(resultado.error?.issues).toEqual([
            expect.objectContaining({ path: ['confirmacion'], message: RENEW_PASSWORD_MESSAGES.matches }),
        ])
    })

    it('marca la confirmación aunque la nueva todavía no cumpla sus reglas', () => {
        expect(mensajes('abc', 'abcd')).toEqual([
            RENEW_PASSWORD_MESSAGES.minLength,
            RENEW_PASSWORD_MESSAGES.uppercase,
            RENEW_PASSWORD_MESSAGES.number,
            RENEW_PASSWORD_MESSAGES.matches,
        ])
    })
})
