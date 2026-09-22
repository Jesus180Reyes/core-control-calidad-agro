/**
 * Si el navegador nunca avisa que el diálogo se cerró, el iframe se saca igual
 * pasado este rato. Es largo a propósito: sacarlo con el diálogo todavía
 * abierto cancela la impresión.
 */
const LIMPIEZA_TARDIA_MS = 5 * 60_000

/**
 * Abre el diálogo de impresión del navegador sobre un documento ya generado,
 * sin descargarlo. Es el hermano de `downloadUrl`: misma object URL, otro gesto.
 *
 * La promesa resuelve **cuando el diálogo se abrió**, no cuando se cerró. No es
 * una simplificación: con un PDF no hay señal confiable de que la impresión
 * terminó. El `afterprint` se queda en el visor interno del navegador y no sube
 * ni a la ventana del iframe ni a la de la página, y el foco tampoco vuelve de
 * forma predecible —con "Microsoft Print to PDF" se encadena además el diálogo
 * nativo de guardado—. Esperar esa señal deja la promesa colgada para siempre;
 * quien llama confirma con el operario.
 *
 * El iframe se limpia por su cuenta (`programarLimpieza`), porque sacarlo del
 * DOM mientras el diálogo está abierto cancela la impresión.
 */
export function printUrl(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const marco = document.createElement('iframe')

        marco.style.position = 'fixed'
        marco.style.width = '0'
        marco.style.height = '0'
        marco.style.border = '0'
        marco.style.visibility = 'hidden'
        marco.src = url

        marco.onload = () => {
            const ventanaDelMarco = marco.contentWindow

            if (!ventanaDelMarco) {
                marco.remove()
                reject(new Error('No se pudo abrir el documento para imprimir.'))
                return
            }

            try {
                ventanaDelMarco.focus()
                ventanaDelMarco.print()
            } catch {
                marco.remove()
                reject(new Error('El navegador no pudo abrir el diálogo de impresión.'))
                return
            }

            programarLimpieza(marco, ventanaDelMarco)
            resolve()
        }

        marco.onerror = () => {
            marco.remove()
            reject(new Error('No se pudo cargar el documento para imprimir.'))
        }

        document.body.appendChild(marco)
    })
}

/**
 * Saca el iframe en cuanto el navegador avise que terminó de imprimir, y si no
 * avisa —el caso del PDF— pasado `LIMPIEZA_TARDIA_MS`. Mientras tanto queda un
 * iframe de 0×0 en el DOM, que es mucho más barato que una impresión cancelada.
 */
function programarLimpieza(marco: HTMLIFrameElement, ventanaDelMarco: Window) {
    let limpiado = false

    const limpiar = () => {
        if (limpiado) return
        limpiado = true

        clearTimeout(reloj)
        ventanaDelMarco.removeEventListener('afterprint', limpiar)
        window.removeEventListener('afterprint', limpiar)
        marco.remove()
    }

    const reloj = setTimeout(limpiar, LIMPIEZA_TARDIA_MS)

    ventanaDelMarco.addEventListener('afterprint', limpiar)
    window.addEventListener('afterprint', limpiar)
}
