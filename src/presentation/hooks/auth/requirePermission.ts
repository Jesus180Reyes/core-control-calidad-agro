import { redirect } from '@tanstack/react-router'

import { leerPermisos } from './almacenamientoSesion'
import type { Permission } from '#/presentation/types/auth/permissions'

/**
 * Guard de ruta por permiso, para el `beforeLoad` de un `createFileRoute`.
 *
 * No es un hook: se llama fuera de React, así que lee los permisos directo de
 * `localStorage` en vez de pasar por `usePermissions`.
 *
 * Sin el permiso, tira el `redirect` de TanStack Router a `/` — tirar y no
 * devolver es lo que corta la navegación, y es la única forma de que una URL
 * escrita a mano no entre.
 *
 * Ocultar la ruta sigue siendo comodidad, no control de acceso: `localStorage`
 * se edita desde la consola del navegador y quien tiene que rechazar la
 * operación es el backend, endpoint por endpoint.
 */
export function requirePermission(permission: Permission): void {
    // Una sesión vieja, sin la clave `auth_permisos`, devuelve `[]` y rebota:
    // es el mismo camino que no tener el permiso.
    if (leerPermisos().includes(permission)) return

    throw redirect({ to: '/' })
}
