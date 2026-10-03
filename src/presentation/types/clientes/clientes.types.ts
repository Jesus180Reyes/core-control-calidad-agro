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


declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
