import type { HttpClient } from '#/infrastructure/http/core/create-http-client'
import { leerToken, limpiarSesion } from '#/presentation/hooks/auth/almacenamientoSesion'

export function peticionLlevaToken(headers?: HeadersInit): boolean {
  if (headers && new Headers(headers).has('Authorization')) return false

  return leerToken() !== null
}

const RUTA_LOGIN = '/login'

export function cerrarSesionYSalir(): void {
  limpiarSesion()
  if (typeof window !== 'undefined') window.location.assign(RUTA_LOGIN)
}


const yaRegistrados = new WeakSet<HttpClient>()

export function registrarInterceptoresAuth(cliente: HttpClient): void {
  if (yaRegistrados.has(cliente)) return
  yaRegistrados.add(cliente)

  cliente.interceptores.onPeticion((ctx) => {
    if (ctx.headers.has('Authorization')) return

    const token = leerToken()
    if (!token) return

    ctx.headers.set('Authorization', `Bearer ${token}`)
  })
}
