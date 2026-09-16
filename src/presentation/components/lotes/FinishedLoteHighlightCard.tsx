import { useState } from 'react'
import { Boxes, CheckCircle2, FileDown, Flag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { DownloadActaDialog } from '#/presentation/components/lotes/DownloadActaDialog'
import type { ActaReportFormat } from '#/presentation/components/lotes/DownloadActaDialog'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'

const SIN_VARIEDAD = 'Sin variedad o talla'
const SIN_REGISTRO = 'Sin registro'

const CARD_STYLES = cn(
    'group relative isolate overflow-hidden w-full text-left',
    'rounded-[28px] border border-border-ui/60 bg-surface p-6',
    'shadow-clay-card transition-all duration-300',
    'hover:-translate-y-1 hover:border-emerald-500/30',
    'hover:shadow-[0_18px_40px_-12px_rgba(16,185,129,0.25)]',
)

// El halo de color vive detrás del contenido (`-z-10`) y se aviva en el hover:
// es lo único que se mueve en la card, así que no compite con el texto.
const HALO_STYLES = cn(
    'pointer-events-none absolute -right-16 -top-16 -z-10 size-48 rounded-full blur-3xl',
    'bg-gradient-to-br from-emerald-400/30 via-teal-400/20 to-indigo-500/20',
    'opacity-70 transition-opacity duration-300 group-hover:opacity-100',
)

const ICON_STYLES = cn(
    'flex size-12 shrink-0 items-center justify-center rounded-2xl',
    'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    'shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)]',
    'transition-transform duration-300 group-hover:scale-105',
)

// Verde plano y ancho completo: alcanza para que se lea como la acción de la
// card, sin degradado ni glow que compitan con el resto.
const ACTA_BUTTON_STYLES = cn(
    'mt-5 h-10 w-full rounded-xl text-xs font-semibold',
    'bg-emerald-600 text-white hover:bg-emerald-700',
    'cursor-pointer',
)

interface FinishedLoteHighlightCardProps {
    lote: FinishedLote
    /** Descarga del acta en el formato elegido. Todavía no hay endpoint que la resuelva. */
    onDownloadActa?: (lote: FinishedLote, formato: ActaReportFormat) => void
    downloadingActa?: boolean
}

export function FinishedLoteHighlightCard({
    lote,
    onDownloadActa,
    downloadingActa = false,
}: FinishedLoteHighlightCardProps) {
    const [dialogAbierto, setDialogAbierto] = useState(false)

    const descargarActa = (formato: ActaReportFormat) => {
        setDialogAbierto(false)
        onDownloadActa?.(lote, formato)
    }

    const trazas = [
        {
            id: 'aprobado',
            icono: CheckCircle2,
            etiqueta: 'Aprobado por',
            persona: lote.aprobado_por,
            fecha: lote.aprobado_en,
            iconClassName: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50',
        },
        {
            id: 'finalizado',
            icono: Flag,
            etiqueta: 'Finalizado por',
            persona: lote.finalizado_por,
            fecha: lote.finalizado_en,
            iconClassName: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50',
        },
    ]

    return (
        <article className={CARD_STYLES}>
            <span className={HALO_STYLES} aria-hidden />

            <header className="flex items-start gap-4">
                <span className={ICON_STYLES}>
                    <Boxes className="size-6" strokeWidth={2.2} aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold leading-tight text-text-main">
                        {lote.nombre_lote}
                    </p>
                    <p className="truncate text-[11px] font-medium text-text-muted">
                        {lote.producto} · {lote.variedad_o_talla ?? SIN_VARIEDAD}
                    </p>
                </div>

                <span
                    className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-2 pr-3',
                        'bg-emerald-50 text-[10px] font-bold uppercase tracking-wide text-emerald-700',
                        'ring-1 ring-inset ring-emerald-500/20',
                        'dark:bg-emerald-950/50 dark:text-emerald-400',
                    )}
                >
                    <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    {lote.estado}
                </span>
            </header>

            <RangoDePeso lote={lote} />

            <div className="mt-5 border-t border-border-ui/60 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Etapa · <span className="text-text-main">{lote.etapa}</span>
                </p>

                <ol className="space-y-3">
                    {trazas.map((traza) => (
                        <TrazaItem
                            key={traza.id}
                            icono={traza.icono}
                            etiqueta={traza.etiqueta}
                            persona={traza.persona}
                            fecha={traza.fecha}
                            iconClassName={traza.iconClassName}
                        />
                    ))}
                </ol>
            </div>

            <Button
                size="lg"
                className={ACTA_BUTTON_STYLES}
                disabled={downloadingActa}
                onClick={() => setDialogAbierto(true)}
            >
                <FileDown className="size-4" strokeWidth={2.4} aria-hidden />
                {downloadingActa ? 'Generando acta…' : 'Descargar acta de entrega'}
            </Button>

            <DownloadActaDialog
                lote={lote}
                open={dialogAbierto}
                onOpenChange={setDialogAbierto}
                onSelectFormat={descargarActa}
                isPending={downloadingActa}
            />
        </article>
    )
}

interface RangoDePesoProps {
    lote: FinishedLote
}

/**
 * Los tres pesos de referencia leídos como un rango y no como tres cajas: la
 * barra da la proporción de un vistazo y el marcador señala dónde cae el ideal.
 */
function RangoDePeso({ lote }: RangoDePesoProps) {
    const posicion = posicionDelIdeal(lote)

    return (
        <section className="mt-6">
            <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                    Rango de peso
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                    Ideal {lote.peso_ideal}
                    <span className="ml-0.5 lowercase font-medium text-text-muted">
                        {lote.unidad_medida}
                    </span>
                </p>
            </div>

            <div className="relative mt-3 h-2.5 rounded-full bg-linear-to-r from-slate-200 via-emerald-400 to-slate-200 dark:from-zinc-800 dark:via-emerald-600 dark:to-zinc-800">
                {posicion !== null && (
                    <span
                        className={cn(
                            'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full',
                            'border-[3px] border-surface bg-emerald-500',
                            'shadow-[0_0_0_3px_rgba(16,185,129,0.25)]',
                        )}
                        style={{ left: `${posicion}%` }}
                        aria-hidden
                    />
                )}
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-text-main">
                <PesoExtremo etiqueta="Mín" valor={lote.peso_minimo} unidad={lote.unidad_medida} />
                <PesoExtremo etiqueta="Máx" valor={lote.peso_maximo} unidad={lote.unidad_medida} />
            </div>
        </section>
    )
}

interface PesoExtremoProps {
    etiqueta: string
    valor: string
    unidad: string
}

function PesoExtremo({ etiqueta, valor, unidad }: PesoExtremoProps) {
    return (
        <p>
            <span className="mr-1 text-[10px] font-bold uppercase text-text-muted">
                {etiqueta}
            </span>
            {valor}
            <span className="ml-0.5 text-[10px] font-normal lowercase text-text-muted">
                {unidad}
            </span>
        </p>
    )
}

interface TrazaItemProps {
    icono: LucideIcon
    etiqueta: string
    persona: string | null
    fecha: string | null
    iconClassName: string
}

function TrazaItem({
    icono: Icono,
    etiqueta,
    persona,
    fecha,
    iconClassName,
}: TrazaItemProps) {
    const fechaLegible = formatDate(fecha)

    return (
        <li className="flex items-center gap-3">
            <span
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl',
                    iconClassName,
                )}
            >
                <Icono className="size-4" strokeWidth={2.4} aria-hidden />
            </span>

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
            </div>

            {fechaLegible && (
                <p className="shrink-0 text-[11px] font-medium text-text-muted">
                    {fechaLegible}
                </p>
            )}
        </li>
    )
}

/**
 * Porcentaje del ideal dentro del rango mín–máx. Devuelve `null` cuando los
 * pesos no son números o el rango está invertido: sin eso el marcador se iría
 * fuera de la barra o quedaría en `NaN%`.
 */
function posicionDelIdeal(lote: FinishedLote) {
    const minimo = Number(lote.peso_minimo)
    const ideal = Number(lote.peso_ideal)
    const maximo = Number(lote.peso_maximo)

    const sonNumeros = [minimo, ideal, maximo].every(Number.isFinite)
    if (!sonNumeros || maximo <= minimo) return null

    const porcentaje = ((ideal - minimo) / (maximo - minimo)) * 100

    return Math.min(100, Math.max(0, porcentaje))
}
