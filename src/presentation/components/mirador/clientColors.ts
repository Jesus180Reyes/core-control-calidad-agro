/**
 * Colores de cliente del Mirador. Categóricos y sin verde, ámbar ni rojo: esos
 * tres quedan sólo para la calidad de los pesajes. El color sale de la fila del
 * cliente en el tablero, que es estable (ver `assignSlots`), así la escena y los
 * paneles lo pintan igual sin pasarse nada.
 */
export const CLIENT_COLORS = ['#4A8FE0', '#8D6FE0', '#C2894C', '#D96C9D', '#6E82A6', '#3E9BB8', '#B07CC6', '#9C7A5B']

export function clientColor(row: number | undefined): string {
    return CLIENT_COLORS[Math.max(0, row ?? 0) % CLIENT_COLORS.length]
}

export function clientInitials(nombre: string): string {
    const palabras = nombre.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p))
    return ((palabras[0]?.[0] ?? '') + (palabras[palabras.length > 1 ? palabras.length - 1 : 1]?.[0] ?? '')).toUpperCase()
}
