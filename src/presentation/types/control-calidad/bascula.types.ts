/**
 * Estados posibles del enlace con la báscula (Web Serial).
 *
 * - `no-soportada`  : el navegador no expone `navigator.serial` (Firefox, Safari, SSR).
 * - `desconectada`  : nunca se conectó, o el operario cerró el puerto.
 * - `conectando`    : se está pidiendo/abriendo el puerto.
 * - `conectada`     : puerto abierto y llegando tramas.
 * - `sin-senal`     : puerto abierto pero la báscula dejó de enviar datos
 *                     (indicador apagado, cable RS-232 flojo, modo reposo).
 * - `reconectando`  : intentando reabrir el puerto automáticamente.
 * - `error`         : falló la apertura del puerto.
 */
export type EstadoBascula =
    | 'no-soportada'
    | 'desconectada'
    | 'conectando'
    | 'conectada'
    | 'sin-senal'
    | 'reconectando'
    | 'error'

/** Por qué se cortó la comunicación con la báscula. */
export type MotivoDesconexion =
    | 'usuario'    // el operario pulsó "Desconectar"
    | 'cable'      // desconexión física del USB / adaptador serial
    | 'sin-senal'  // puerto abierto, pero la báscula dejó de transmitir
    | 'stream'     // el flujo de lectura se cerró o dio error
    | 'error'      // error inesperado

export interface InfoDesconexion {
    motivo: MotivoDesconexion
    /** Mensaje listo para mostrar al operario. */
    mensaje: string
    /** Hora local (HH:mm:ss) en que se detectó el corte. */
    hora: string
    timestamp: number
    /** Última lectura conocida antes del corte (útil para auditoría). */
    pesoAlDesconectar: number
    /**
     * `true` cuando el puerto sigue abierto y la comunicación puede volver sola
     * (caso `sin-senal`). `false` cuando hubo que cerrar el puerto.
     */
    recuperable: boolean
    /** `true` si había un pesaje en proceso que quedó invalidado. */
    interrumpioPesaje: boolean
}
