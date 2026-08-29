// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `useAuth` monta `useNavigate`, que fuera de un `RouterProvider` lanza.
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn(),
}))

import { guardarPermisos, guardarSesion, leerSesion, limpiarSesion, suscribir } from './almacenamientoSesion'
import { usePermissions } from './usePermissions'
import { PERMISSIONS, advertirPermisosDesconocidos } from '#/presentation/types/auth/permissions'
import type { Usuario } from '#/presentation/types/auth/auth.types'

const USUARIO: Usuario = { complete_name: 'Luis de Jesus Reyes Nolasco', rol: 'OPERADOR' }

/** Escribe una sesión "vieja" a mano, sin pasar por `guardarSesion`. */
function sembrarSesionSinPermisos(): void {
    localStorage.setItem('auth_token', 'token-1')
    localStorage.setItem('auth_user', JSON.stringify(USUARIO))
}

beforeEach(() => {
    localStorage.clear()
    limpiarSesion()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('almacenamiento de permisos', () => {
    it('una sesión sin `auth_permisos` sigue siendo válida y devuelve una lista vacía', () => {
        sembrarSesionSinPermisos()

        const sesion = leerSesion()

        expect(sesion).not.toBeNull()
        expect(sesion?.permisos).toEqual([])
    })

    it('degrada a lista vacía si el JSON está corrupto, sin invalidar la sesión', () => {
        sembrarSesionSinPermisos()
        localStorage.setItem('auth_permisos', '{{{')

        const sesion = leerSesion()

        expect(sesion).not.toBeNull()
        expect(sesion?.permisos).toEqual([])
    })

    it('degrada a lista vacía si lo parseado no es un array', () => {
        sembrarSesionSinPermisos()
        localStorage.setItem('auth_permisos', '42')

        expect(leerSesion()?.permisos).toEqual([])
    })

    it('`guardarPermisos` persiste la clave y notifica a los suscriptores', () => {
        sembrarSesionSinPermisos()
        const aviso = vi.fn()
        const desuscribir = suscribir(aviso)

        guardarPermisos([PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR])

        expect(localStorage.getItem('auth_permisos')).toBe('["clientes.listar","lotes.crear"]')
        expect(aviso).toHaveBeenCalledTimes(1)
        expect(leerSesion()?.permisos).toEqual(['clientes.listar', 'lotes.crear'])

        desuscribir()
    })

    it('`limpiarSesion` borra `auth_permisos` junto con las otras tres claves', () => {
        guardarSesion({
            accessToken: 'token-1',
            usuario: USUARIO,
            refreshToken: 'refresh-1',
            permisos: [PERMISSIONS.CLIENTES_LISTAR],
        })

        limpiarSesion()

        expect(localStorage.getItem('auth_token')).toBeNull()
        expect(localStorage.getItem('auth_user')).toBeNull()
        expect(localStorage.getItem('auth_refresh')).toBeNull()
        expect(localStorage.getItem('auth_permisos')).toBeNull()
    })
})

describe('usePermissions', () => {
    function montarConPermisos(permisos: string[]) {
        guardarSesion({ accessToken: 'token-1', usuario: USUARIO, permisos })
        return renderHook(() => usePermissions())
    }

    it('`has` distingue un permiso concedido de uno ausente', () => {
        const { result } = montarConPermisos([PERMISSIONS.CLIENTES_LISTAR])

        expect(result.current.has(PERMISSIONS.CLIENTES_LISTAR)).toBe(true)
        expect(result.current.has(PERMISSIONS.LOTES_CREAR)).toBe(false)
    })

    it('`hasAny` alcanza con uno y `hasAll` los exige todos', () => {
        const { result } = montarConPermisos([PERMISSIONS.CLIENTES_LISTAR])

        expect(result.current.hasAny(PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR)).toBe(true)
        expect(result.current.hasAll(PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR)).toBe(false)
    })

    it('`hasAll` da true cuando están todos', () => {
        const { result } = montarConPermisos([PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR])

        expect(result.current.hasAll(PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR)).toBe(true)
    })

    it('sin sesión, la lista está vacía y los tres helpers dan false', () => {
        const { result } = renderHook(() => usePermissions())

        expect(result.current.permissions).toEqual([])
        expect(result.current.has(PERMISSIONS.CLIENTES_LISTAR)).toBe(false)
        expect(result.current.hasAny(PERMISSIONS.CLIENTES_LISTAR)).toBe(false)
        expect(result.current.hasAll(PERMISSIONS.CLIENTES_LISTAR)).toBe(false)
    })

    it('reacciona a `guardarPermisos` sin volver a montar', () => {
        const { result } = montarConPermisos([])
        expect(result.current.has(PERMISSIONS.LOTES_CREAR)).toBe(false)

        act(() => guardarPermisos([PERMISSIONS.LOTES_CREAR]))

        expect(result.current.has(PERMISSIONS.LOTES_CREAR)).toBe(true)
    })
})

describe('advertirPermisosDesconocidos', () => {
    it('avisa una sola vez de los permisos que el catálogo no conoce', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        expect(() =>
            advertirPermisosDesconocidos([PERMISSIONS.CLIENTES_LISTAR, 'reportes.exportar']),
        ).not.toThrow()

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toContain('reportes.exportar')
    })

    it('no avisa cuando todos los permisos están en el catálogo', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        advertirPermisosDesconocidos([PERMISSIONS.CLIENTES_LISTAR, PERMISSIONS.LOTES_CREAR])

        expect(warn).not.toHaveBeenCalled()
    })
})
