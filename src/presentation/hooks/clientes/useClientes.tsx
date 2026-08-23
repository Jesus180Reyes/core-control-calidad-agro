import { useNavigate } from '@tanstack/react-router'

import { useExecuteQuery } from '#/presentation/hooks/shared/useExecuteQuery'
import type { Cliente, RespuestaClientes } from '#/presentation/types/clientes/clientes.types'

/** Clave de caché del listado, para invalidarlo desde otras pantallas. */
export const CLAVE_CLIENTES = ['clientes']

export function useClientes() {
    const navigate = useNavigate()

    /**
     * `GET /clientes` no acepta paginación, búsqueda ni filtros: el backend ya
     * devuelve sólo los clientes activos vinculados al operador del token, y
     * ordenados por nombre. De ahí que no haya params.
     *
     * Suspende: quien monte este hook va dentro de <Suspense> y <ErrorBoundary>.
     */
    const { data } = useExecuteQuery<RespuestaClientes>(CLAVE_CLIENTES, '/clientes')

    /**
     * El cliente completo viaja en el `state` del historial, no en la URL. Si
     * se pierde (recarga, entrada directa), el guard de `/control-calidad`
     * devuelve al operario a esta pantalla.
     */
    const seleccionarCliente = (cliente: Cliente) => {
        navigate({ to: '/control-calidad', state: { cliente } })
    }

    return { clientes: data.clientes, seleccionarCliente }
}
