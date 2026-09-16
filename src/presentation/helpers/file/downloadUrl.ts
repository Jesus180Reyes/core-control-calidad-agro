/**
 * Dispara la descarga de una object URL con el nombre indicado.
 *
 * El ancla se monta y se quita en el acto: sin agregarlo al documento, Firefox
 * ignora el `click()` sintético y la descarga no arranca. La URL no se revoca
 * acá —la dueña es quien la creó (`useExecutePdfMutation`)—.
 */
export function downloadUrl(url: string, nombreArchivo: string) {
    const ancla = document.createElement('a')

    ancla.href = url
    ancla.download = nombreArchivo
    ancla.rel = 'noopener'

    document.body.appendChild(ancla)
    ancla.click()
    ancla.remove()
}
