import { useGetCatalogosUsuarios } from '#/presentation/hooks/catalogos/useGetCatalogosUsuarios'

/**
 * Usuarios de la tabla de `/soporte`.
 *
 * Provisorio: el backend no tiene un `GET /usuarios` de gestión, así que se lee
 * el catálogo `GET /catalogos/usuarios`, que trae sólo `{ id, nombre }` de los
 * usuarios **activos** (los inactivos no aparecen). Cuando exista el endpoint
 * completo, se cambia acá y la tabla suma columnas.
 */
export function useSupportUsers() {
    const { usuarios } = useGetCatalogosUsuarios()

    return { users: usuarios }
}
