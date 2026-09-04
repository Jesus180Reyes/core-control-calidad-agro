import type { ReactNode } from 'react'

/**
 * Encabezado de una card seccionada: ícono en cuadro de marca, título en
 * versalitas y una línea de apoyo. El divisor de abajo lo trae el propio
 * header, así que la card sólo aporta el borde y el fondo.
 */
interface SectionCardHeaderProps {
    title: string
    description?: string
    icon?: ReactNode
    /** Chip a la derecha; se oculta si no se pasa. Ej. `"3 activos"`. */
    badge?: string
    className?: string
}

export function SectionCardHeader({
    title,
    description,
    icon,
    badge,
    className = '',
}: SectionCardHeaderProps) {
    return (
        <header
            className={`flex flex-wrap items-center justify-between gap-3 border-b border-border-ui/70 px-5 py-4 sm:px-6 ${className}`}
        >
            <div className="flex items-center gap-3">
                {icon && (
                    <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-2xl border border-brand/20 bg-brand/10 text-brand"
                    >
                        {icon}
                    </span>
                )}

                <div className="space-y-0.5">
                    <h2 className="text-xs font-black uppercase tracking-[0.14em] text-text-main">
                        {title}
                    </h2>

                    {description && (
                        <p className="text-xs leading-relaxed text-text-muted">{description}</p>
                    )}
                </div>
            </div>

            {badge && (
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {badge}
                </span>
            )}
        </header>
    )
}
