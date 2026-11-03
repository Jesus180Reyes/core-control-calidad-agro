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
