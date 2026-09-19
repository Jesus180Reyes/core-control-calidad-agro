import type { ReactNode } from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'

import { cn } from '#/lib/utils'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { MarkdownContent } from '#/presentation/components/shared/MarkdownContent'
import type { FinishedLote } from '#/presentation/types/lotes/lotes.types'

interface AiSummaryDialogProps {
    /** El lote del resumen abierto; `null` cierra el diálogo. */
    lote: FinishedLote | null
    resumen: string
    isPending: boolean
    isError: boolean
    onRetry: () => void
    onClose: () => void
}

/**
 * Diálogo del resumen IA de un lote. Se abre enseguida, con el spinner adentro,
 * porque el backend redacta el texto y eso tarda: esperar con el diálogo cerrado
 * se lee como que el botón no hizo nada.
 */
export function AiSummaryDialog({
    lote,
    resumen,
    isPending,
    isError,
    onRetry,
    onClose,
}: AiSummaryDialogProps) {
    return (
        <CustomDialog
            open={lote !== null}
            onOpenChange={(open) => !open && onClose()}
            title="Resumen del lote"
            description={
                lote
                    ? `Resumen generado por IA del lote "${lote.nombre_lote}".`
                    : undefined
            }
            size="xl"
            footer={
                <CustomButton variant="secondary" fullWidth={false} onClick={onClose}>
                    Cerrar
                </CustomButton>
            }
        >
            <ResumenBody
                resumen={resumen}
                isPending={isPending}
                isError={isError}
                onRetry={onRetry}
            />
        </CustomDialog>
    )
}

interface ResumenBodyProps {
    resumen: string
    isPending: boolean
    isError: boolean
    onRetry: () => void
}

function ResumenBody({ resumen, isPending, isError, onRetry }: ResumenBodyProps) {
    if (isPending) {
        return (
            <div className="py-10">
                <LoadingState size="sm" className="py-0" />
                <p className="mt-5 text-center text-xs font-semibold text-text-muted">
                    Generando el resumen del lote…
                </p>
            </div>
        )
    }

    if (isError) {
        return (
            <EstadoDeAviso
                icono={<TriangleAlert className="size-5" strokeWidth={2.2} aria-hidden />}
                iconClassName="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                mensaje="No se pudo generar el resumen del lote."
            >
                <CustomButton variant="secondary" fullWidth={false} onClick={onRetry}>
                    Reintentar
                </CustomButton>
            </EstadoDeAviso>
        )
    }

    // Un 2xx sin texto: el resumen se generó vacío y un diálogo en blanco no
    // dice nada.
    if (!resumen.trim()) {
        return (
            <EstadoDeAviso
                icono={<Sparkles className="size-5" strokeWidth={2.2} aria-hidden />}
                iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                mensaje="La IA no devolvió ningún resumen para este lote."
            />
        )
    }

    return <MarkdownContent content={resumen} className="py-2" />
}

interface EstadoDeAvisoProps {
    icono: ReactNode
    iconClassName: string
    mensaje: string
    children?: ReactNode
}

function EstadoDeAviso({ icono, iconClassName, mensaje, children }: EstadoDeAvisoProps) {
    return (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span
                className={cn(
                    'flex size-12 items-center justify-center rounded-2xl',
                    iconClassName,
                )}
            >
                {icono}
            </span>
            <p className="text-sm font-semibold text-text-main">{mensaje}</p>
            {children}
        </div>
    )
}
