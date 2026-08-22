interface ClientesHeaderProps {
    titulo: string
    paso?: string
    descripcion?: string
}

export function ClientesHeader({ titulo, paso, descripcion }: ClientesHeaderProps) {
    return (
        <header className="space-y-1">
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
        </header>
    )
}
