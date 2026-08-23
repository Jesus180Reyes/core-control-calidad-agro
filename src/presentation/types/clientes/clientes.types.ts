/**
 * Tipos del listado de clientes, calcados del contrato de `GET /clientes`.
 *
 * El endpoint sólo selecciona estos seis campos: no devuelve `rtn`,
 * `correo_contacto`, ubicación, `created_by` ni fechas. Si alguna pantalla los
 * necesita, hay que pedirlos al backend antes de tipearlos acá.
 */
export interface Cliente {
    id: number
    nombre: string
    /** `null` cuando el cliente no tiene producto asignado (LEFT JOIN a `productos`). */
    producto: string | null
    codigo_exportacion: string | null
    telefono: string | null
    direccion_planta: string | null
}

/** El listado viaja envuelto: la lista está en `clientes`, no en `data`. */
export interface RespuestaClientes {
    ok: boolean
    msg: string
    clientes: Cliente[]
}


declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
