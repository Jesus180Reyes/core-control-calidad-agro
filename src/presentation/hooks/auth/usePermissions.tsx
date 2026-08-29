import { useMemo } from 'react'

import { useAuth } from '#/presentation/hooks/auth/useAuth'
import type { Permission } from '#/presentation/types/auth/permissions'

interface UsePermissionsResult {
    permissions: string[]
    has: (permission: Permission) => boolean
    hasAny: (...permissions: Permission[]) => boolean
    hasAll: (...permissions: Permission[]) => boolean
}

// Constante de módulo y no un `[]` inline: un array nuevo por render invalidaría
// el `useMemo` de abajo en cada pasada.
const SIN_PERMISOS: string[] = []

export function usePermissions(): UsePermissionsResult {
    const { sesion } = useAuth()
    const permissions = sesion?.permisos ?? SIN_PERMISOS

    // Un `<Can>` por fila haría un `includes` lineal en cada render.
    const concedidos = useMemo(() => new Set(permissions), [permissions])

    const has = (permission: Permission): boolean => concedidos.has(permission)

    return {
        permissions,
        has,
        hasAny: (...lista) => lista.some((permission) => has(permission)),
        hasAll: (...lista) => lista.every((permission) => has(permission)),
    }
}
