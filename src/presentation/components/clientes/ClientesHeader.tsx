import type { ReactNode } from 'react'
import type { LinkProps } from '@tanstack/react-router'

import { cn } from '#/lib/utils'
import { BackButton } from '#/presentation/components/shared/BackButton'

const PASO_STYLES = cn(
    'inline-flex items-center gap-2 rounded-full',
    'border border-brand/20 bg-brand/10 px-3 py-1',
    'text-[10px] font-bold uppercase tracking-[0.14em] text-brand',
)

interface ClientesHeaderProps {
    titulo: string
    paso?: string
    descripcion?: string
    /** Si se pasa, se pinta la flecha de volver a la izquierda del título. */
    backTo?: LinkProps['to']
    /** Acciones de la pantalla, alineadas a la derecha del título. */
    actions?: ReactNode
}

export function ClientesHeader({ titulo, paso, descripcion, backTo, actions }: ClientesHeaderProps) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                {backTo && <BackButton fallbackTo={backTo} className="mt-1.5" />}

                <div className="space-y-2">
                    {paso && (
                        <span className={PASO_STYLES}>
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                            {paso}
                        </span>
                    )}
                    <h1 className="text-[26px] font-black leading-tight tracking-tight text-text-main sm:text-3xl">
                        {titulo}
                    </h1>
                    {descripcion && (
                        <p className="max-w-xl text-sm leading-relaxed text-text-muted">
                            {descripcion}
                        </p>
                    )}
                </div>
            </div>

            {actions && <div className="shrink-0">{actions}</div>}
        </header>
    )
}
