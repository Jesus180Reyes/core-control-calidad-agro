import type { Sesion, Usuario } from '#/presentation/types/auth/auth.types'

const CLAVE_TOKEN = 'auth_token'
const CLAVE_USUARIO = 'auth_user'
const CLAVE_REFRESH = 'auth_refresh'
const CLAVE_PERMISOS = 'auth_permisos'

const suscriptores = new Set<() => void>()

// `useSyncExternalStore` compara el snapshot por referencia: cachear evita que
// cada llamada devuelva un objeto nuevo y dispare un loop de rerenders.
let cacheValida = false
let sesionCacheada: Sesion | null = null

function invalidarCache(): void {
    cacheValida = false
}

function almacen(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function notificar(): void {
    for (const fn of suscriptores) fn()
}

function limpiarStorage(storage: Storage): void {
    try {
        storage.removeItem(CLAVE_TOKEN)
        storage.removeItem(CLAVE_USUARIO)
        storage.removeItem(CLAVE_REFRESH)
        storage.removeItem(CLAVE_PERMISOS)
    } catch {
        // Sin acceso a localStorage: no hay nada que limpiar.
    }
}

// Los permisos corruptos degradan a `[]` sin lanzar: una lista ilegible no
// invalida la sesión, igual que un refresh token ausente.
function leerPermisosDe(storage: Storage): string[] {
    try {
        const crudo = storage.getItem(CLAVE_PERMISOS)
        if (!crudo) return []

        const permisos = JSON.parse(crudo)
        return Array.isArray(permisos) ? permisos : []
    } catch {
        return []
    }
}

export function leerSesion(): Sesion | null {
    const storage = almacen()
    if (!storage) return null

    try {
        const accessToken = storage.getItem(CLAVE_TOKEN)
        const crudoUsuario = storage.getItem(CLAVE_USUARIO)
        if (!accessToken || !crudoUsuario) {
            if (accessToken || crudoUsuario) limpiarStorage(storage)
            return null
        }

        const usuario: Usuario = JSON.parse(crudoUsuario)

        // El refresh token no participa de la validación: una sesión sin él es
        // legítima (es la que emite el backend de hoy).
        const refreshToken = storage.getItem(CLAVE_REFRESH) ?? undefined

        return { accessToken, usuario, refreshToken, permisos: leerPermisosDe(storage) }
    } catch {
        limpiarStorage(storage)
        return null
    }
}

export function guardarSesion(sesion: Sesion): void {
    const storage = almacen()
    if (!storage) {
        invalidarCache()
        notificar()
        return
    }

    try {
        storage.setItem(CLAVE_TOKEN, sesion.accessToken)
        storage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario))

        // Si el backend no lo manda, se borra el de la sesión anterior en vez
        // de dejarlo colgado apuntando a un usuario que ya no está logueado.
        if (sesion.refreshToken) storage.setItem(CLAVE_REFRESH, sesion.refreshToken)
        else storage.removeItem(CLAVE_REFRESH)

        storage.setItem(CLAVE_PERMISOS, JSON.stringify(sesion.permisos))
    } catch {
        // Cuota llena o escritura denegada: se sigue sin persistir.
    }
    invalidarCache()
    notificar()
}

/**
 * Actualiza los dos tokens tras un refresh, sin tocar al usuario.
 *
 * No notifica a los suscriptores a propósito: `useAuth` lee por
 * `useSyncExternalStore`, y avisar en cada refresh rerenderizaría la app entera
 * en mitad de una petición para informar un cambio que nadie puede percibir.
 * La caché sí se invalida, para que la próxima lectura no devuelva el token viejo.
 */
export function guardarTokens(tokens: { accessToken: string; refreshToken?: string }): void {
    const storage = almacen()
    if (!storage) {
        invalidarCache()
        return
    }

    try {
        storage.setItem(CLAVE_TOKEN, tokens.accessToken)
        if (tokens.refreshToken) storage.setItem(CLAVE_REFRESH, tokens.refreshToken)
    } catch {
        // Cuota llena o escritura denegada: se sigue con el token en memoria.
    }
    invalidarCache()
}

/**
 * A diferencia de `guardarTokens`, este sí notifica: `<Can>` tiene que
 * repintarse cuando la lista llega.
 */
export function guardarPermisos(permisos: string[]): void {
    const storage = almacen()
    if (!storage) {
        invalidarCache()
        notificar()
        return
    }

    try {
        storage.setItem(CLAVE_PERMISOS, JSON.stringify(permisos))
    } catch {
        // Cuota llena o escritura denegada: se sigue sin persistir.
    }
    invalidarCache()
    notificar()
}

export function leerPermisos(): string[] {
    const storage = almacen()
    if (!storage) return []

    return leerPermisosDe(storage)
}

export function limpiarSesion(): void {
    const storage = almacen()
    if (storage) limpiarStorage(storage)
    invalidarCache()
    notificar()
}

export function leerToken(): string | null {
    const storage = almacen()
    if (!storage) return null

    try {
        return storage.getItem(CLAVE_TOKEN)
    } catch {
        return null
    }
}

export function leerRefreshToken(): string | null {
    const storage = almacen()
    if (!storage) return null

    try {
        return storage.getItem(CLAVE_REFRESH)
    } catch {
        return null
    }
}

export function suscribir(fn: () => void): () => void {
    suscriptores.add(fn)
    return () => suscriptores.delete(fn)
}

export function snapshot(): Sesion | null {
    if (!cacheValida) {
        sesionCacheada = leerSesion()
        cacheValida = true
    }
    return sesionCacheada
}
