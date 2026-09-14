import { CheckCircle2, Flag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { LoteCard } from '#/presentation/components/lotes/LoteCard'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'

const SIN_REGISTRO = 'Sin registro'

interface FinishedLoteCardProps {
    lote: FinishedLote
}

export function FinishedLoteCard({ lote }: FinishedLoteCardProps) {
    return (
        <LoteCard
            lote={lote}
            footer={
                <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                        Etapa: {lote.etapa}
                    </p>

                    <Traza
                        icono={CheckCircle2}
                        etiqueta="Aprobado por"
                        persona={lote.aprobado_por}
                        fecha={lote.aprobado_en}
                    />
                    <Traza
                        icono={Flag}
                        etiqueta="Finalizado por"
                        persona={lote.finalizado_por}
                        fecha={lote.finalizado_en}
                    />
                </div>
            }
        />
    )
}

interface TrazaProps {
    icono: LucideIcon
    etiqueta: string
    persona: string | null
    fecha: string | null
}

function Traza({ icono: Icono, etiqueta, persona, fecha }: TrazaProps) {
    const fechaLegible = formatDate(fecha)

    return (
        <div className="flex items-start gap-2.5 text-left">
            <Icono
                className="mt-0.5 size-4 shrink-0 text-emerald-600"
                strokeWidth={2.2}
                aria-hidden
            />

            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-tight text-text-muted">
                    {etiqueta}
                </p>
                <p
                    className={cn(
                        'truncate text-xs font-bold',
                        persona ? 'text-text-main' : 'text-text-muted',
                    )}
                >
                    {persona ?? SIN_REGISTRO}
                </p>
                {fechaLegible && (
                    <p className="text-[11px] font-medium text-text-muted">
                        {fechaLegible}
                    </p>
                )}
            </div>
        </div>
    )
}
