import type { CatalogoData } from '#/presentation/types/catalogos/catalogo_response'
import type { Paginacion } from '#/presentation/types/shared/paginacion.types'

export interface Cliente {
    id: number
    nombre: string
    producto: string | null
    codigo_exportacion: string | null
    telefono: string | null
    direccion_planta: string | null
}

export interface ClientesResponse {
    ok: boolean
    msg: string
    clientes: Cliente[]
    paginacion?: Paginacion // solo cuando se pidió página
}

/** SPEC 41 del backend. Solo los campos que cambiaron; nunca vacío. */
export type EditarClienteBody = Partial<{
    nombre: string
    producto_id: number
    correo_contacto: string
    telefono: string
    direccion_planta: string
}>

/** SPEC 42 del backend. Mismo `{ id, nombre }` que los catálogos. */
export interface OperadoresClienteResponse {
    ok: boolean
    msg: string
    operadores: CatalogoData[]
}

/** SPEC 42 del backend. El conjunto final de operadores, nunca vacío. */
export interface EditarOperadoresClienteBody {
    usuario_ids: number[]
}

declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
