/**
 * Tipos del selector de básculas autorizadas (Web Serial).
 *
 * El selector lista únicamente los puertos que el navegador ya autorizó
 * (`navigator.serial.getPorts()`). Autorizar uno nuevo exige `requestPort()`,
 * que siempre muestra el diálogo nativo del navegador.
 */

/**
 * Clave estable de una báscula, derivada de los IDs USB del puerto:
 * `"0403:6001"` (vendorId:productId en hex de 4 dígitos).
 * Los puertos sin IDs USB (COM nativo) usan `"sin-id:<índice>"`.
 *
 * Aviso: dos adaptadores del mismo modelo comparten `vendorId:productId` y por
 * tanto la misma clave. Web Serial no expone número de serie, así que no hay
 * forma de distinguirlos por software.
 */
export type ClaveBascula = string

export interface BasculaDisponible {
    clave: ClaveBascula
    /** Nombre que puso el operario. `null` si la báscula nunca recibió alias. */
    alias: string | null
    usbVendorId?: number
    usbProductId?: number
    /** Puerto vivo de Web Serial. No se persiste. */
    puerto: SerialPort
    /** `true` si es la báscula guardada como preferida. */
    esPreferida: boolean
}
