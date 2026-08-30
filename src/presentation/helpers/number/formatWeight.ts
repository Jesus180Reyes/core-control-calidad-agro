export function formatWeight(valor: string | number) {
    const numero = Number(valor)

    if (!Number.isFinite(numero)) return String(valor)

    return numero.toLocaleString('es', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}
