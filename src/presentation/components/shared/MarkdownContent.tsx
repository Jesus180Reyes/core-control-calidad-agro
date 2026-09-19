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

interface MarkdownContentProps {
    /** Markdown crudo, tal como lo devuelve el backend. */
    content: string
    className?: string
}

/**
 * Pinta markdown que llega del backend. Sin `rehype-raw` a propósito: el HTML
 * que venga adentro se muestra como texto en vez de ejecutarse.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
    return (
        <div className={cn(PROSE_STYLES, className)}>
            <Markdown>{content}</Markdown>
        </div>
    )
}
