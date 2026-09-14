/**
 * Para valores donde redondear a dos decimales cambia el dato, como el tipo de
 * cambio: el backend lo manda con más precisión y esa precisión es la que se
 * usó para calcular el documento.
 */
export function formatDecimal(valor: string | number, maximoDecimales = 6) {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) return String(valor)

    return numero.toLocaleString('es', {
        minimumFractionDigits: 2,
        maximumFractionDigits: maximoDecimales,
    })
}
