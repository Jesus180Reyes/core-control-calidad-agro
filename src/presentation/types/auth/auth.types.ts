

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
    /** SPEC 33 del backend. Siempre false en el 200; el caso true llega como 403. */
    passwordVencida?: boolean
}

/** Cuerpo de `POST /auth/renovar-password` (SPEC 14). Público: sale sin `Bearer`. */
export interface RenovarPasswordRequest {
    username: string
    password_actual: string
    password_nueva: string
}

/** Lo que devuelve `POST /auth/renovar-password`. No trae token: el ingreso sale por el login. */
export interface RenovarPasswordResponse {
    ok: boolean
    msg: string
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
