// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `useAuth` monta `useNavigate`, que fuera de un `RouterProvider` lanza.
// `redirect` se stubea como un objeto reconocible: sólo importa que el guard lo tire.
vi.mock('@tanstack/react-router', () => ({
    useNavigate: () => vi.fn(),
    redirect: (opciones: { to: string }) => ({ esRedirect: true, ...opciones }),
}))

import { guardarPermisos, guardarSesion, leerSesion, limpiarSesion, suscribir } from './almacenamientoSesion'
import { requirePermission } from './requirePermission'
import { usePermissions } from './usePermissions'
import { PERMISSIONS, advertirPermisosDesconocidos, type Permission } from '#/presentation/types/auth/permissions'
import type { Usuario } from '#/presentation/types/auth/auth.types'

const USUARIO: Usuario = { complete_name: 'Luis de Jesus Reyes Nolasco', rol: 'OPERADOR' }

const CONTROL_CALIDAD = PERMISSIONS.MODULOCONTROLCALIDAD

// El catálogo tiene un solo permiso hoy: para probar las combinaciones hace
// falta un segundo string tipado a mano.
const OTRO_MODULO = 'MODULO-REPORTES' as Permission

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

        guardarPermisos([CONTROL_CALIDAD, OTRO_MODULO])

        expect(localStorage.getItem('auth_permisos')).toBe('["MODULO-CONTROL-CALIDAD","MODULO-REPORTES"]')
        expect(aviso).toHaveBeenCalledTimes(1)
        expect(leerSesion()?.permisos).toEqual(['MODULO-CONTROL-CALIDAD', 'MODULO-REPORTES'])

        desuscribir()
    })

    it('`limpiarSesion` borra `auth_permisos` junto con las otras tres claves', () => {
        guardarSesion({
            accessToken: 'token-1',
            usuario: USUARIO,
            refreshToken: 'refresh-1',
            permisos: [CONTROL_CALIDAD],
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
        const { result } = montarConPermisos([CONTROL_CALIDAD])

        expect(result.current.has(CONTROL_CALIDAD)).toBe(true)
        expect(result.current.has(OTRO_MODULO)).toBe(false)
    })

    it('`hasAny` alcanza con uno y `hasAll` los exige todos', () => {
        const { result } = montarConPermisos([CONTROL_CALIDAD])

        expect(result.current.hasAny(CONTROL_CALIDAD, OTRO_MODULO)).toBe(true)
        expect(result.current.hasAll(CONTROL_CALIDAD, OTRO_MODULO)).toBe(false)
    })

    it('`hasAll` da true cuando están todos', () => {
        const { result } = montarConPermisos([CONTROL_CALIDAD, OTRO_MODULO])

        expect(result.current.hasAll(CONTROL_CALIDAD, OTRO_MODULO)).toBe(true)
    })

    it('sin sesión, la lista está vacía y los tres helpers dan false', () => {
        const { result } = renderHook(() => usePermissions())

        expect(result.current.permissions).toEqual([])
        expect(result.current.has(CONTROL_CALIDAD)).toBe(false)
        expect(result.current.hasAny(CONTROL_CALIDAD)).toBe(false)
        expect(result.current.hasAll(CONTROL_CALIDAD)).toBe(false)
    })

    it('reacciona a `guardarPermisos` sin volver a montar', () => {
        const { result } = montarConPermisos([])
        expect(result.current.has(CONTROL_CALIDAD)).toBe(false)

        act(() => guardarPermisos([CONTROL_CALIDAD]))

        expect(result.current.has(CONTROL_CALIDAD)).toBe(true)
    })
})

describe('requirePermission', () => {
    it('deja pasar cuando el permiso está concedido', () => {
        guardarSesion({ accessToken: 'token-1', usuario: USUARIO, permisos: [CONTROL_CALIDAD] })

        expect(() => requirePermission(CONTROL_CALIDAD)).not.toThrow()
    })

    it('rebota a `/` cuando el permiso falta: la URL escrita a mano no entra', () => {
        guardarSesion({ accessToken: 'token-1', usuario: USUARIO, permisos: [OTRO_MODULO] })

        expect(() => requirePermission(CONTROL_CALIDAD)).toThrow(
            expect.objectContaining({ esRedirect: true, to: '/' }),
        )
    })

    it('rebota también con una sesión vieja, sin `auth_permisos`', () => {
        sembrarSesionSinPermisos()

        expect(() => requirePermission(CONTROL_CALIDAD)).toThrow(
            expect.objectContaining({ esRedirect: true, to: '/' }),
        )
    })
})

describe('advertirPermisosDesconocidos', () => {
    it('avisa una sola vez de los permisos que el catálogo no conoce', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        expect(() =>
            advertirPermisosDesconocidos([CONTROL_CALIDAD, 'reportes.exportar']),
        ).not.toThrow()

        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0][0]).toContain('reportes.exportar')
    })

    it('no avisa cuando todos los permisos están en el catálogo', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        advertirPermisosDesconocidos([CONTROL_CALIDAD])

        expect(warn).not.toHaveBeenCalled()
    })
})
