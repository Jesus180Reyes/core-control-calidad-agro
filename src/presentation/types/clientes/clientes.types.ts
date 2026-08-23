
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
}


declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
