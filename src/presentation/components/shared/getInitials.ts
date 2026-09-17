/**
 * Iniciales de un nombre completo: la primera letra del primer nombre y la del
 * último apellido ("Dev Person" → "DP"). Con una sola palabra devuelve una letra.
 */
export function getInitials(nombreCompleto: string): string {
    const palabras = nombreCompleto.trim().split(/\s+/)
    const primera = palabras[0]?.[0] ?? ''
    const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : ''
    return `${primera}${ultima}`.toUpperCase()
}
