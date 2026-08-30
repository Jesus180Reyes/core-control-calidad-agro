import type { LinkProps } from '@tanstack/react-router'

import { BackButton } from '#/presentation/components/shared/BackButton'

interface ClientesHeaderProps {
    titulo: string
    paso?: string
    descripcion?: string
    /** Si se pasa, se pinta la flecha de volver a la izquierda del título. */
    backTo?: LinkProps['to']
}

export function ClientesHeader({ titulo, paso, descripcion, backTo }: ClientesHeaderProps) {
    return (
        <header className="flex items-start gap-3">
            {backTo && <BackButton fallbackTo={backTo} className="mt-1" />}

            <div className="space-y-1">
                {paso && (
                    <span className="text-xs font-bold tracking-widest text-text-muted uppercase">
                        {paso}
                    </span>
                )}
                <h1 className="text-2xl font-black tracking-tight text-text-main">
                    {titulo}
                </h1>
                {descripcion && (
                    <p className="text-sm text-text-muted">
                        {descripcion}
                    </p>
                )}
            </div>
        </header>
    )
}
