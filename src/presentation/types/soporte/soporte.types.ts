/**
 * Lo que devuelve `PATCH /auth/usuarios/:id/pin`. El PIN (4 dígitos, string para
 * no perder ceros a la izquierda) lo genera el backend y viaja **una sola vez**:
 * ninguna otra respuesta lo vuelve a mostrar.
 */
export interface AssignSupervisorPinResponse {
    ok: boolean
    msg: string
    pin: string
}

export interface CreateUserResponse {
    ok: boolean
    msg: string
    user: number
    password_temporal: string
}

export const USER_ROLES = [
    { id: 1, nombre: 'OPERADOR' },
    { id: 3, nombre: 'SUPERVISOR' },
    { id: 4, nombre: 'APROBADOR' },
    { id: 5, nombre: 'CONTADOR' },
    { id: 6, nombre: 'SOPORTE' },
    { id: 2, nombre: 'ADMIN' },
] as const

/**
 * Lo que devuelve `PATCH /auth/usuarios/:id/reset-password`. La contraseña
 * temporal viaja **una sola vez** y nace vencida: al ingresar con ella, el
 * usuario cae en el diálogo de renovación.
 */
export interface ResetUserPasswordResponse {
    ok: boolean
    msg: string
    password_temporal: string
}
