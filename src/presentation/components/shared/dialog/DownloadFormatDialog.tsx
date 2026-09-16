import type { ReactNode } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

interface ReportFormatOption {
    formato: ReportFormat
    etiqueta: string
    detalle: string
    icono: LucideIcon
    iconClassName: string
}

const OPCIONES: ReportFormatOption[] = [
    {
        formato: 'pdf',
        etiqueta: 'Descargar Reporte en PDF',
        detalle: 'Documento listo para imprimir o firmar.',
        icono: FileText,
        iconClassName: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    },
    {
        formato: 'excel',
        etiqueta: 'Descargar Reporte en Excel',
        detalle: 'Planilla con el detalle, lista para editar.',
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

interface DownloadFormatDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    onSelectFormat: (formato: ReportFormat) => void
    isPending?: boolean
    /**
     * Filtros del reporte, si los tiene. Se pintan arriba de los formatos: el
     * formato es lo último que se elige porque es lo que dispara la descarga.
     */
    filters?: ReactNode
}


export function DownloadFormatDialog({
    open,
    onOpenChange,
    title,
    description,
    onSelectFormat,
    isPending = false,
    filters,
}: DownloadFormatDialogProps) {
    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            size={filters ? 'lg' : 'md'}
        >

            {filters && (
                <div className="mb-4 border-b border-border-ui/70 pb-4">{filters}</div>
            )}

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
