import { z } from 'zod'

/**
 * Textos de las reglas de la contraseña nueva. Son a la vez el mensaje del
 * schema y la línea del checklist del `ExpiredPasswordDialog`.
 *
 * Las cuatro primeras repiten las de `RenovarPasswordDto` del backend (SPEC 33),
 * que las vuelve a validar: si cambian allá, hay que tocarlas acá.
 */
export const RENEW_PASSWORD_MESSAGES = {
    minLength: 'Al menos 8 caracteres',
    uppercase: 'Al menos una mayúscula',
    number: 'Al menos un número',
    different: 'Distinta de la contraseña actual',
    matches: 'Las contraseñas coinciden',
} as const

/**
 * Schema del formulario de renovación (SPEC 14).
 *
 * Es una factory y no una constante porque "distinta de la actual" se puede
 * validar en el front: la contraseña actual es la que el usuario acaba de
 * escribir en el login, y el 403 garantiza que es la correcta.
 */
export function createRenewPasswordSchema(currentPassword: string) {
    return z
        .object({
            password_nueva: z
                .string()
                .min(8, { message: RENEW_PASSWORD_MESSAGES.minLength })
                .regex(/[A-Z]/, { message: RENEW_PASSWORD_MESSAGES.uppercase })
                .regex(/[0-9]/, { message: RENEW_PASSWORD_MESSAGES.number })
                .refine((valor) => valor !== currentPassword, {
                    message: RENEW_PASSWORD_MESSAGES.different,
                }),
            confirmacion: z.string(),
        })
        .refine((valores) => valores.confirmacion === valores.password_nueva, {
            message: RENEW_PASSWORD_MESSAGES.matches,
            path: ['confirmacion'],
            when: (payload) => {
                const valores = payload.value as Partial<Record<'password_nueva' | 'confirmacion', unknown>>
                return typeof valores.password_nueva === 'string' && typeof valores.confirmacion === 'string'
            },
        })
}

export type RenewPasswordFormValues = z.infer<ReturnType<typeof createRenewPasswordSchema>>
