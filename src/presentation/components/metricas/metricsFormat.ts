// Formato de los números del tablero de métricas. Los valores llegan ya
// calculados del backend: acá sólo se escriben, nunca se dividen.

export const EMPTY_VALUE = '—'

const DOS_DECIMALES: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}

export function formatCount(valor: number): string {
    return valor.toLocaleString('es', { maximumFractionDigits: 0 })
}

export function formatPercent(valor: number): string {
    return valor.toLocaleString('es', DOS_DECIMALES)
}

// La desviación siempre lleva el signo, con el menos tipográfico. Lo que
// redondea a cero se escribe sin signo: un "−0,00" no dice nada.
export function formatSignedPercent(valor: number): string {
    const absoluto = formatPercent(Math.abs(valor))
    if (absoluto === formatPercent(0)) return absoluto

    return `${valor > 0 ? '+' : '−'}${absoluto}`
}

// Los nombres del catálogo llegan en mayúsculas ("PESO IDEAL").
export function toSentenceCase(texto: string): string {
    const minusculas = texto.toLocaleLowerCase('es')
    return minusculas.charAt(0).toLocaleUpperCase('es') + minusculas.slice(1)
}
