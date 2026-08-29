

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
    /** Opcional hasta que el backend lo emita (ver SPEC 06). */
    refreshToken?: string
}

export interface PermisosResponse {
    ok: boolean
    msg: string
    permisos: string[]
}

export interface Sesion {
    accessToken: string
    usuario: Usuario
    refreshToken?: string
    permisos: string[]
}

/** Lo que devuelve `POST /auth/refresh`. Con rotación: el refresh viejo queda invalidado. */
export interface RefreshResponse {
    accessToken: string
    refreshToken?: string
}
