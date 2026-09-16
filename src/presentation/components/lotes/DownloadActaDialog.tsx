import { FileSpreadsheet, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'

export type ActaReportFormat = 'pdf' | 'excel'

interface ActaReportOption {
    formato: ActaReportFormat
    etiqueta: string
    detalle: string
    icono: LucideIcon
    iconClassName: string
}

const OPCIONES: ActaReportOption[] = [
    {
        formato: 'pdf',
        etiqueta: 'Descargar Reporte en PDF',
        detalle: 'Acta lista para imprimir o firmar.',
        icono: FileText,
        iconClassName: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    },
    {
        formato: 'excel',
        etiqueta: 'Descargar Reporte en Excel',
        detalle: 'Planilla con el detalle de los pesajes.',
        icono: FileSpreadsheet,
        iconClassName:
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
]

const OPTION_STYLES = cn(
    'flex w-full items-center gap-4 rounded-2xl border border-border-ui bg-bg-app p-4 text-left',
    'transition-all hover:border-emerald-500/40 hover:bg-surface active:scale-[0.99]',
    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
)

interface DownloadActaDialogProps {
    lote: FinishedLote
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectFormat: (formato: ActaReportFormat) => void
    isPending?: boolean
}

/**
 * Elige el formato del acta antes de descargarla. El diálogo sólo informa la
 * elección: quién pide el archivo al backend es la pantalla.
 */
export function DownloadActaDialog({
    lote,
    open,
    onOpenChange,
    onSelectFormat,
    isPending = false,
}: DownloadActaDialogProps) {
    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Descargar acta de entrega"
            description={`Elegí en qué formato querés el acta del lote "${lote.nombre_lote}".`}
            size="md"
        >
            <div className="flex flex-col gap-3 py-1">
                {OPCIONES.map((opcion) => (
                    <button
                        key={opcion.formato}
                        type="button"
                        className={OPTION_STYLES}
                        disabled={isPending}
                        onClick={() => onSelectFormat(opcion.formato)}
                    >
                        <span
                            className={cn(
                                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                                opcion.iconClassName,
                            )}
                        >
                            <opcion.icono className="size-5" strokeWidth={2.2} aria-hidden />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-text-main">
                                {opcion.etiqueta}
                            </span>
                            <span className="block text-[11px] font-medium text-text-muted">
                                {opcion.detalle}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </CustomDialog>
    )
}
