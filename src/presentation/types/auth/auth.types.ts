

export interface Usuario {
    complete_name: string
    rol: string
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
