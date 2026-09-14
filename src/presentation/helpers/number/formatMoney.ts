const formatoMonto = new Intl.NumberFormat('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

/**
 * El backend manda los importes como string y la moneda en un campo aparte.
 *
 * No se usa `style: 'currency'` a propósito: `Intl` tira `RangeError` ante un
 * código que no conoce, y acá la moneda llega tal cual la guardó el backend.
 * El código va adelante del monto, que es como se leen las facturas en planta.
 */
export function formatMoney(valor: string | number, moneda?: string) {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) return String(valor)

    const monto = formatoMonto.format(numero)

    return moneda ? `${moneda} ${monto}` : monto
}
