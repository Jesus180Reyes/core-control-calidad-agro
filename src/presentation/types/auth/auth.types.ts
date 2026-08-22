
export type RolUsuario = string

export interface Usuario {
    id: number
    cedula: string
    username: string
    complete_name: string
    rol: RolUsuario
}

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    ok: boolean
    msg: string
    user: Usuario
    accessToken: string
}

export interface Sesion {
    accessToken: string
    usuario: Usuario
}
