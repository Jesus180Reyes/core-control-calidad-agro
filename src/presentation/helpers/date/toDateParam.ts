import { toDate } from '#/presentation/helpers/date/toDate'

/**
 * `YYYY-MM-DD` en hora local para los filtros de fecha del API.
 *
 * No sirve `toISOString()`: convierte a UTC, y un `desde` elegido de noche en un
 * huso al oeste se manda como el día siguiente.
 *
 * Sin fecha válida devuelve `undefined`, que `query-params.ts` omite de la URL.
 * La alternativa —mandar `NaN-NaN-NaN` y que el backend filtre por eso— da una
 * tabla vacía sin ningún error a la vista.
 */
export function toDateParam(valor: unknown): string | undefined {
    const fecha = toDate(valor)

    if (!fecha) return undefined

    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')

    return `${fecha.getFullYear()}-${mes}-${dia}`
}
