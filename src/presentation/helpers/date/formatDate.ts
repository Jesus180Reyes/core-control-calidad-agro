const formatoFecha = new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
})

export function formatDate(valor: string | number | Date) {
    const fecha = valor instanceof Date ? valor : new Date(valor)

    if (Number.isNaN(fecha.getTime())) return ''

    return formatoFecha.format(fecha)
}
