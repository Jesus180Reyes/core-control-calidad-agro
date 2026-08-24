import { Boxes } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { Lote } from '#/presentation/types/lotes/lotes.types'

const SIN_VARIEDAD = 'Sin variedad o talla'

const CARD_STYLES = cn(
    'w-full text-left bg-surface border border-border-ui/50 rounded-[28px] p-6',
    'shadow-clay-card space-y-5 cursor-pointer transition-all duration-200',
    'hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-900/50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
)

const ICON_STYLES = cn(
    'w-11 h-11 shrink-0 rounded-xl flex items-center justify-center',
    'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600',
)

const BADGE_STYLES = cn(
    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
)

interface LoteCardProps {
    lote: Lote
    onSeleccionar: (lote: Lote) => void
}

export function LoteCard({ lote, onSeleccionar }: LoteCardProps) {

    return (
        <button type="button" onClick={() => onSeleccionar(lote)} className={CARD_STYLES}>
            <div className="flex items-center gap-4">
                <span className={ICON_STYLES}>
                    <Boxes className="w-5 h-5" strokeWidth={2.2} />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-text-main font-extrabold truncate">
                        {lote.nombre_lote}
                    </p>
                    <p className="text-text-muted text-[11px] font-medium truncate">
                        {lote.producto} · {lote.variedad_o_talla ?? SIN_VARIEDAD}
                    </p>
                </div>

                <span
                    className={cn(
                        BADGE_STYLES,
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    )}
                >
                    {lote.estado}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <PesoReferencia etiqueta="Mínimo" valor={lote.peso_minimo} unidad={lote.unidad_medida} />
                <PesoReferencia etiqueta="Ideal" valor={lote.peso_ideal} unidad={lote.unidad_medida} destacado />
                <PesoReferencia etiqueta="Máximo" valor={lote.peso_maximo} unidad={lote.unidad_medida} />
            </div>
        </button>
    )
}

interface PesoReferenciaProps {
    etiqueta: string
    valor: string
    unidad: string
    destacado?: boolean
}

function PesoReferencia({ etiqueta, valor, unidad, destacado = false }: PesoReferenciaProps) {
    return (
        <div
            className={cn(
                'rounded-2xl p-3 text-center border',
                destacado
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/15'
                    : 'bg-slate-50/60 dark:bg-zinc-800/40 border-border-ui/50',
            )}
        >
            <p
                className={cn(
                    'text-[10px] font-bold uppercase tracking-tight',
                    destacado ? 'text-indigo-500' : 'text-text-muted',
                )}
            >
                {etiqueta}
            </p>
            <p
                className={cn(
                    'text-sm font-extrabold mt-0.5',
                    destacado ? 'text-indigo-600' : 'text-text-main',
                )}
            >
                {valor}
                <span className="text-text-muted font-normal text-[10px] ml-0.5 lowercase">
                    {unidad}
                </span>
            </p>
        </div>
    )
}
