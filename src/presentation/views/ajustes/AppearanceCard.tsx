import { Check, Palette } from 'lucide-react'

import { cn } from '#/lib/utils'
import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { ThemePreview } from '#/presentation/views/ajustes/ThemePreview'
import { useTheme } from '#/presentation/theme/ThemeProvider'

type ThemeOption = 'system' | 'light' | 'dark'

interface ThemeChoice {
    value: ThemeOption
    label: string
    hint: string
}

const OPCIONES: ThemeChoice[] = [
    { value: 'system', label: 'Automático', hint: 'Sigue al sistema' },
    { value: 'light', label: 'Claro', hint: 'Turnos de día' },
    { value: 'dark', label: 'Oscuro', hint: 'Turnos de noche' },
]

export function AppearanceCard() {
    const { theme, setTheme } = useTheme()

    return (
        <section className="overflow-hidden rounded-[28px] border border-border-ui bg-surface shadow-clay-card">
            <SectionCardHeader
                title="Apariencia"
                description="Cómo se ve la app en este equipo."
                icon={<Palette className="size-5" strokeWidth={2.1} />}
            />

            <div className="space-y-4 p-5 sm:p-6">
                <div
                    role="radiogroup"
                    aria-label="Modo de apariencia"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    {OPCIONES.map((opcion) => (
                        <ThemeOptionCard
                            key={opcion.value}
                            opcion={opcion}
                            seleccionado={theme === opcion.value}
                            onSelect={() => setTheme(opcion.value)}
                        />
                    ))}
                </div>

                <p className="text-xs leading-relaxed text-text-muted">
                    La preferencia se guarda en este navegador, así que otro equipo de la planta
                    puede tener un modo distinto.
                </p>
            </div>
        </section>
    )
}

interface ThemeOptionCardProps {
    opcion: ThemeChoice
    seleccionado: boolean
    onSelect: () => void
}

/** Una de las tres muestras: la maqueta arriba, el nombre y el check abajo. */
function ThemeOptionCard({ opcion, seleccionado, onSelect }: ThemeOptionCardProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={seleccionado}
            onClick={onSelect}
            className={cn(
                'group relative flex cursor-pointer flex-col gap-3 rounded-3xl border-2 p-3 text-left',
                'transition-all duration-200 ease-out active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                seleccionado
                    ? 'border-brand bg-brand/[0.06]'
                    : 'border-border-ui bg-surface hover:border-brand/30 hover:bg-brand/[0.035]',
            )}
        >
            <div className="h-24 w-full lg:h-28">
                <ThemePreview mode={opcion.value} />
            </div>

            <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="leading-tight">
                    <p className={cn('text-sm font-bold', seleccionado ? 'text-brand' : 'text-text-main')}>
                        {opcion.label}
                    </p>
                    <p className="text-[11px] text-text-muted">{opcion.hint}</p>
                </div>

                <SelectedMark visible={seleccionado} />
            </div>
        </button>
    )
}

/** El check de la opción elegida: siempre montado, escala de 0 a 1 al elegirla. */
function SelectedMark({ visible }: { visible: boolean }) {
    return (
        <span
            aria-hidden
            className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full transition-all duration-200',
                visible ? 'scale-100 bg-brand text-white' : 'scale-0 bg-transparent',
            )}
        >
            <Check className="size-3.5" strokeWidth={3} />
        </span>
    )
}
