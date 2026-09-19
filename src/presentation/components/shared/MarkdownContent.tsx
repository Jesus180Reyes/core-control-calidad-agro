import type { Element, ElementContent, Root } from 'hast'
import Markdown from 'react-markdown'

import { cn } from '#/lib/utils'

/**
 * Tipografía del markdown: `prose` del plugin de Tailwind, reencauzada a los
 * tokens del proyecto para que el texto no se vaya a los grises propios del
 * plugin y siga al tema claro/oscuro como el resto de la app.
 */
const PROSE_STYLES = cn(
    'prose prose-sm max-w-none dark:prose-invert',
    'prose-headings:font-extrabold prose-headings:text-text-main',
    'prose-p:text-text-main prose-li:text-text-main prose-strong:text-text-main',
    'prose-a:text-brand prose-code:text-text-main',
    'prose-hr:border-border-ui prose-blockquote:border-border-ui',
    'prose-blockquote:text-text-muted',
)

/** Lo que tarda una palabra en salir después de la anterior. */
const RETARDO_ENTRE_PALABRAS_MS = 26

/**
 * Tope de lo que puede tardar el texto entero en terminar de aparecer. Con un
 * retardo fijo, un resumen largo dejaría la última línea esperando medio
 * minuto; pasado este tope, el paso entre palabras se comprime.
 */
const DURACION_MAXIMA_MS = 3200

/** Un bloque de código se anima entero: partirlo rompería el monoespaciado. */
const TAGS_SIN_ANIMAR = new Set(['code', 'pre'])

/** Nodo del árbol HTML que puede contener texto. */
interface ContenedorHast {
    children: ElementContent[]
}

/**
 * Envuelve cada palabra en un `span.md-word` con su propio `animation-delay`,
 * que es lo que produce la aparición escalonada (ver `.md-word` en
 * `styles.css`). El retardo se reparte acá, sobre el total de palabras ya
 * contadas, y no en CSS, porque el paso depende de qué tan largo salió el
 * texto.
 */
function rehypeFadeWords() {
    return (tree: Root) => {
        const palabras: Element[] = []
        // El árbol del markdown es un fragmento: no trae `doctype`, así que sus
        // hijos son todos `ElementContent`.
        envolverPalabras(tree as unknown as ContenedorHast, palabras)

        const paso = Math.min(
            RETARDO_ENTRE_PALABRAS_MS,
            DURACION_MAXIMA_MS / Math.max(palabras.length, 1),
        )
        palabras.forEach((palabra, indice) => {
            palabra.properties.style = `animation-delay:${Math.round(indice * paso)}ms`
        })
    }
}

function envolverPalabras(nodo: ContenedorHast, palabras: Element[]) {
    nodo.children = nodo.children.flatMap((hijo): ElementContent[] => {
        if (hijo.type === 'text') return partirEnPalabras(hijo.value, palabras)

        if (hijo.type === 'element' && !TAGS_SIN_ANIMAR.has(hijo.tagName)) {
            envolverPalabras(hijo, palabras)
        }

        return [hijo]
    })
}

function partirEnPalabras(valor: string, palabras: Element[]): ElementContent[] {
    // Los espacios quedan como texto suelto entre los `span`: envolverlos
    // también rompería el corte de línea del párrafo.
    return valor
        .split(/(\s+)/)
        .filter(Boolean)
        .map((trozo) => {
            if (!trozo.trim()) return { type: 'text', value: trozo }

            const palabra: Element = {
                type: 'element',
                tagName: 'span',
                properties: { className: ['md-word'] },
                children: [{ type: 'text', value: trozo }],
            }
            palabras.push(palabra)
            return palabra
        })
}

const PLUGINS_ANIMADOS = [rehypeFadeWords]

interface MarkdownContentProps {
    /** Markdown crudo, tal como lo devuelve el backend. */
    content: string
    /**
     * Hace aparecer el texto palabra por palabra al montarse, como el chat de
     * una IA. Para texto que el usuario espera mientras se genera; en contenido
     * que ya estaba ahí, sólo demora la lectura.
     */
    animated?: boolean
    className?: string
}

/**
 * Pinta markdown que llega del backend. Sin `rehype-raw` a propósito: el HTML
 * que venga adentro se muestra como texto en vez de ejecutarse.
 */
export function MarkdownContent({ content, animated, className }: MarkdownContentProps) {
    return (
        <div className={cn(PROSE_STYLES, className)}>
            <Markdown rehypePlugins={animated ? PLUGINS_ANIMADOS : undefined}>
                {content}
            </Markdown>
        </div>
    )
}
