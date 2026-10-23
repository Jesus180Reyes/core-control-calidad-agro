interface AgriSuggestionChipsProps {
    suggestions: string[]
    /** Sólo la última respuesta, y sin un turno en vuelo, tiene las cápsulas activas. */
    disabled: boolean
    onSelect: (suggestion: string) => void
}

/**
 * Las preguntas que propone Agri cuando no entendió del todo la anterior, tal
 * como llegan en `sugerencias` de `POST /chat` (SPEC 48 del backend). Tocar una
 * la manda como si el usuario la hubiera escrito.
 *
 * Llevan el acento de Agri y no los tokens generales a propósito: con
 * `border-border-ui` se confundirían con las tarjetas de la bienvenida, y esto
 * es una acción de la respuesta.
 *
 * El texto es plano, no markdown: va tal cual, sin `MarkdownContent`.
 */
export function AgriSuggestionChips({ suggestions, disabled, onSelect }: AgriSuggestionChipsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, indice) => (
                <button
                    key={suggestion}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(suggestion)}
                    style={{ animationDelay: `${120 + indice * 70}ms`, animationDuration: '420ms' }}
                    className={
                        'rounded-full border border-agri-to/50 bg-surface px-3.5 py-1.5 text-left ' +
                        'text-sm font-semibold text-agri-to transition-colors duration-200 ' +
                        'enabled:cursor-pointer enabled:hover:bg-agri-to/10 ' +
                        'disabled:cursor-default disabled:opacity-45 ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-to/40 ' +
                        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both motion-reduce:animate-none'
                    }
                >
                    {suggestion}
                </button>
            ))}
        </div>
    )
}
