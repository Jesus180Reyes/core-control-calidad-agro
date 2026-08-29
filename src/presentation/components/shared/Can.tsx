import type { ReactNode } from 'react'

import { usePermissions } from '#/presentation/hooks/auth/usePermissions'
import type { Permission } from '#/presentation/types/auth/permissions'

interface CanProps {
    permission?: Permission
    anyOf?: Permission[]
    allOf?: Permission[]
    fallback?: ReactNode
    children: ReactNode
}

/**
 * Ocultar UI es una comodidad, no un control de acceso: quien tiene que
 * rechazar la operación es el backend en cada endpoint.
 */
export function Can({ permission, anyOf, allOf, fallback = null, children }: CanProps) {
    const { has, hasAny, hasAll } = usePermissions()

    // Sin ninguna condición no se esconde nada: un olvido de prop no debería
    // hacer desaparecer contenido en silencio.
    const permitido =
        (permission === undefined || has(permission)) &&
        (anyOf === undefined || hasAny(...anyOf)) &&
        (allOf === undefined || hasAll(...allOf))

    return <>{permitido ? children : fallback}</>
}
