// El lenguaje visual del tablero de métricas (SPEC 15): una superficie, un
// acento, y el color sólo cuando significa algo.

export type MetricTone = 'brand' | 'warning' | 'destructive' | 'neutral'

/** Texto de un valor o una frase. */
export const TONE_TEXT: Record<MetricTone, string> = {
    brand: 'text-brand',
    warning: 'text-warning',
    destructive: 'text-destructive',
    neutral: 'text-text-muted',
}

/** Relleno de barras, segmentos, puntos y marcadores. */
export const TONE_FILL: Record<MetricTone, string> = {
    brand: 'bg-brand',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    neutral: 'bg-text-muted/40',
}

/** Trazo de un SVG pintado con `currentColor`. */
export const TONE_STROKE: Record<MetricTone, string> = {
    brand: 'text-brand',
    warning: 'text-warning',
    destructive: 'text-destructive',
    neutral: 'text-text-muted/40',
}

/** La banda translúcida de μ ± σ del medidor de desviación. */
export const TONE_BAND: Record<MetricTone, string> = {
    brand: 'bg-brand/20',
    warning: 'bg-warning/20',
    destructive: 'bg-destructive/20',
    neutral: 'bg-text-muted/15',
}

// Por `codigo` y nunca por id: los ids del catálogo difieren entre entornos.
// Un código nuevo del backend se pinta neutro y no rompe nada.
export function qualityStateTone(codigo: string): MetricTone {
    switch (codigo) {
        case 'IDEAL':
            return 'brand'
        case 'MAXIMO':
            return 'warning'
        case 'MINIMO':
            return 'destructive'
        default:
            return 'neutral'
    }
}

// Positiva es por encima del ideal (se regala producto), negativa por debajo
// (riesgo de reclamo).
export function deviationTone(valor: number | null): MetricTone {
    if (valor === null || valor === 0) return 'neutral'
    return valor > 0 ? 'warning' : 'destructive'
}

export const METRIC_CARD_CLASS =
    'rounded-[28px] border border-border-ui/60 bg-surface p-5 shadow-clay-card sm:p-6 ' +
    'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500'

/** Las tarjetas entran escalonadas de a 60 ms. */
export function metricCardDelay(indice: number) {
    return { animationDelay: `${indice * 60}ms` }
}

export const METRIC_LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted'

export const METRIC_VALUE_CLASS = 'text-4xl font-extrabold tracking-tight tabular-nums text-text-main'

export const METRIC_UNIT_CLASS = 'ml-1 text-base font-semibold text-text-muted'

export const METRIC_SUPPORT_CLASS = 'text-xs font-medium text-text-muted'

/** La pista hundida de anillos, barras y medidores: el rasgo clay de la pantalla. */
export const SUNKEN_TRACK_CLASS = 'rounded-full bg-bg-app shadow-clay-inset'

// Tope de la escala de desviación: un `peso_ideal` mal cargado (hay un 275% en
// los datos de prueba) aplastaría a todos los demás contra el centro.
export const DEVIATION_SCALE_CAP = 50
