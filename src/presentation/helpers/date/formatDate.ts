import { toDate } from '#/presentation/helpers/date/toDate'

const formatoFecha = new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
})

export function formatDate(valor: unknown) {
    const fecha = toDate(valor)

    if (!fecha) return ''

    return formatoFecha.format(fecha)
}
