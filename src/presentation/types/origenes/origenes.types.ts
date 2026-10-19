/**
 * Respuesta de `POST /origenes`. Trae solo el id del origen creado, para que el
 * formulario del lote lo deje elegido en el selector.
 */
export interface CreateOrigenResponse {
    ok: boolean
    msg: string
    origen_id: number
}
