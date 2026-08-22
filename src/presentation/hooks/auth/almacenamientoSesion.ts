import type { Sesion, Usuario } from '#/presentation/types/auth/auth.types'

const CLAVE_TOKEN = 'auth_token'
const CLAVE_USUARIO = 'auth_user'

const suscriptores = new Set<() => void>()

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
    } catch {
        // Sin acceso a localStorage: no hay nada que limpiar.
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
        return { accessToken, usuario }
    } catch {
        limpiarStorage(storage)
        return null
    }
}

export function guardarSesion(sesion: Sesion): void {
    const storage = almacen()
    if (!storage) {
        notificar()
        return
    }

    try {
        storage.setItem(CLAVE_TOKEN, sesion.accessToken)
        storage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario))
    } catch {
        // Cuota llena o escritura denegada: se sigue sin persistir.
    }
    notificar()
}

export function limpiarSesion(): void {
    const storage = almacen()
    if (storage) limpiarStorage(storage)
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

export function suscribir(fn: () => void): () => void {
    suscriptores.add(fn)
    return () => suscriptores.delete(fn)
}

export function snapshot(): Sesion | null {
    return leerSesion()
}
