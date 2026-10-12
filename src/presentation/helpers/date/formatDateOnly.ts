import { isValid, parse } from 'date-fns'

const formatoFecha = new Intl.DateTimeFormat('es', { dateStyle: 'short' })

/**
 * Pinta una columna `DATE` del backend, que llega como `'YYYY-MM-DD'` pelado.
 *
 * `parse` y no `new Date('YYYY-MM-DD')`: ese lo toma como medianoche UTC y, al
 * oeste de Greenwich, se pinta el día anterior. Sin hora, porque la columna no
 * la tiene.
 */
export function formatDateOnly(valor: string | null | undefined) {
    if (!valor) return ''

    const fecha = parse(valor, 'yyyy-MM-dd', new Date())

    return isValid(fecha) ? formatoFecha.format(fecha) : ''
}
