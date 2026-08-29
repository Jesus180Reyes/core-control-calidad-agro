import type { Cliente } from '#/presentation/types/clientes/clientes.types'

// Constante de módulo y no un `[]` inline: un array nuevo por render le cambiaría
// la referencia a la tabla en cada pasada.
const SIN_CLIENTES: Cliente[] = []

/**
 * Los clientes de la pantalla de inspección.
 *
 * Todavía sin datos: el endpoint no existe. Cuando exista, se reemplaza sólo el
 * interior de este hook por un `useExecuteQuery` y la vista no se entera —
 * mismo camino que `useControlCalidad` y `useParametros`.
 */
export function useClientInspection() {
    return { clientes: SIN_CLIENTES }
}
