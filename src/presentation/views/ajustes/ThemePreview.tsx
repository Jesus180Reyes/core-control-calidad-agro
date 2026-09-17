import { cn } from '#/lib/utils'

/**
 * La maqueta en miniatura de la app que ilustra cada modo.
 *
 * Los colores van escritos a mano y no con los tokens del proyecto a propósito:
 * la muestra del modo claro tiene que verse clara aunque la app esté en oscuro,
 * y un `bg-surface` acá se daría vuelta junto con el resto de la pantalla.
 */
type PreviewMode = 'light' | 'dark'

const SUPERFICIE: Record<PreviewMode, string> = {
    light: 'border-slate-200 bg-slate-50',
    dark: 'border-slate-700 bg-slate-900',
}

const PANEL: Record<PreviewMode, string> = {
    light: 'bg-white',
    dark: 'bg-slate-800',
}

const BARRA: Record<PreviewMode, string> = {
    light: 'bg-slate-200',
    dark: 'bg-slate-700',
}

interface ThemePreviewProps {
    /** `'system'` pinta las dos mitades partidas en diagonal. */
    mode: PreviewMode | 'system'
}

export function ThemePreview({ mode }: ThemePreviewProps) {
    if (mode !== 'system') return <MiniWindow mode={mode} />

    return (
        <div className="relative h-full w-full">
            <MiniWindow mode="light" />

            {/* La mitad inferior derecha, recortada en diagonal sobre la clara. */}
            <div aria-hidden className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                <MiniWindow mode="dark" />
            </div>
        </div>
    )
}

/** El portal en chiquito: el sidebar a la izquierda y el contenido al lado. */
function MiniWindow({ mode }: { mode: PreviewMode }) {
    return (
        <div className={cn('flex h-full w-full gap-2 rounded-2xl border p-2.5', SUPERFICIE[mode])}>
            <PreviewSidebar mode={mode} />
            <PreviewContent mode={mode} />
        </div>
    )
}

function PreviewSidebar({ mode }: { mode: PreviewMode }) {
    return (
        <div className={cn('flex w-1/4 shrink-0 flex-col gap-1.5 rounded-xl p-1.5', PANEL[mode])}>
            <Bar className="w-full bg-indigo-500" />
            <Bar mode={mode} className="w-3/4" />
            <Bar mode={mode} className="w-3/4" />
        </div>
    )
}

function PreviewContent({ mode }: { mode: PreviewMode }) {
    return (
        <div className={cn('flex flex-1 flex-col gap-1.5 rounded-xl p-2', PANEL[mode])}>
            <Bar className="h-2 w-2/3 bg-indigo-500/70" />
            <Bar mode={mode} className="w-full" />
            <Bar mode={mode} className="w-4/5" />
        </div>
    )
}

/** Una línea de texto simulada. Sin `mode` toma el color que le pase el llamador. */
function Bar({ mode, className }: { mode?: PreviewMode; className?: string }) {
    return <span className={cn('h-1.5 rounded-full', mode && BARRA[mode], className)} />
}
