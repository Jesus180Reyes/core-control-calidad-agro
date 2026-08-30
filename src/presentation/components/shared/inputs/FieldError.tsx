interface FieldErrorProps {
    id: string
    message?: string
}

/** Mensaje de error de un campo, con el mismo aspecto en todos los `Controlled*`. */
export function FieldError({ id, message }: FieldErrorProps) {
    if (!message) return null

    return (
        <span
            id={id}
            role="alert"
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-500"
        >
            <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
            </svg>
            {message}
        </span>
    )
}
