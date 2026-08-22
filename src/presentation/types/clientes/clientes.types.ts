
export interface Cliente {
    id: number
    nombre: string
    rtn: string
    producto: string
    codigo_exportacion: string
    correo_contacto: string | null
    telefono: string | null
    direccion_planta: string | null
    ubicacionLongitud: string | null
    ubicacionLatitude: string | null
    created_by: number | null
    created_at: string | null
    updated_at: string | null
}


declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
