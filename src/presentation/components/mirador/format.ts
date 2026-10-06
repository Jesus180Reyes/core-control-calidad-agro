export const nf0 = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 })
export const nf1 = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const nf2 = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Toneladas desde 1000 kg; debajo, kilos. */
export function formatMass(kg: number): { value: string; unit: string } {
    return kg >= 1000 ? { value: nf1.format(kg / 1000), unit: 't' } : { value: nf0.format(kg), unit: 'kg' }
}

export function formatTime(iso: string, seconds = false): string {
    return new Date(iso).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: false })
}

/** Clase de color de texto/fondo por nivel de calidad, con los tokens del proyecto. */
export const QUALITY_TEXT = { ok: 'text-success', desviado: 'text-warning', fuera: 'text-destructive' } as const
export const QUALITY_BG = { ok: 'bg-success', desviado: 'bg-warning', fuera: 'bg-destructive' } as const
export const QUALITY_LABEL = { ok: 'En rango', desviado: 'Desviado', fuera: 'Fuera de rango' } as const

/** La tarjeta de vidrio del HUD del Mirador. */
export const GLASS = 'pointer-events-auto rounded-2xl border border-border-ui/70 bg-surface/80 shadow-clay-card backdrop-blur-xl'
