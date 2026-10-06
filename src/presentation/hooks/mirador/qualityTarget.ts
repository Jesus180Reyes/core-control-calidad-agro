import type { QualityLevel } from '#/presentation/types/mirador/plantTwin.types'

export interface LotRange {
    peso_minimo: string
    peso_ideal: string
    peso_maximo: string
}

/** Más allá de este desvío normalizado, el pesaje en rango se pinta ámbar. */
export const DESVIO_AMBAR = 0.6

/** Hasta dónde llega la diana, en desvío normalizado: el borde muestra un poco más allá del límite. */
export const DIANA_ALCANCE = 1.32

/**
 * Desvío respecto del ideal, normalizado contra el lado que corresponde:
 * `0` es el ideal, `1` el máximo, `-1` el mínimo. Positivo pesa de más.
 */
export function normalizedDeviation(range: LotRange, peso: number): number {
    const minimo = Number(range.peso_minimo)
    const ideal = Number(range.peso_ideal)
    const maximo = Number(range.peso_maximo)
    const desvio = peso - ideal
    if (desvio >= 0) return maximo > ideal ? desvio / (maximo - ideal) : 0
    return ideal > minimo ? desvio / (ideal - minimo) : 0
}

/**
 * Verde, ámbar o rojo. Lo oficial es `fuera_de_rango` del backend: si viene,
 * decide el rojo, y el desvío sólo separa verde de ámbar dentro de lo que el
 * backend dio por bueno. El ámbar es una ayuda visual, no un estado del sistema.
 */
export function qualityLevel(range: LotRange, peso: number, fueraDeRango?: number | boolean): QualityLevel {
    const abs = Math.abs(normalizedDeviation(range, peso))
    if (fueraDeRango !== undefined) {
        if (fueraDeRango) return 'fuera'
        return abs > DESVIO_AMBAR ? 'desviado' : 'ok'
    }
    if (abs > 1) return 'fuera'
    return abs > DESVIO_AMBAR ? 'desviado' : 'ok'
}

export interface TargetPoint {
    x: number
    y: number
    level: QualityLevel
}

/**
 * Posición del pesaje en la diana de radio `radius`. Los que pesan de más van a
 * la derecha y los de menos a la izquierda; la distancia al centro es el desvío.
 * El ángulo dentro de cada mitad sale del `id` (ángulo áureo), así un pesaje no
 * salta de lugar entre renders.
 */
export function targetPoint(range: LotRange, peso: number, id: number, radius: number, fueraDeRango?: number | boolean): TargetPoint {
    const s = normalizedDeviation(range, peso)
    const r = (Math.min(Math.abs(s), DIANA_ALCANCE) / DIANA_ALCANCE) * radius
    const abanico = (((id * 137.508) % 150) - 75) * (Math.PI / 180)
    const angulo = (s >= 0 ? 0 : Math.PI) + abanico
    return { x: Math.cos(angulo) * r, y: Math.sin(angulo) * r, level: qualityLevel(range, peso, fueraDeRango) }
}
