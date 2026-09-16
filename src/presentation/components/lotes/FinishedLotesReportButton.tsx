import { useState } from 'react'
import { Download } from 'lucide-react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { DownloadFormatDialog } from '#/presentation/components/shared/dialog/DownloadFormatDialog'
import { useDownloadFinishedLotesReport } from '#/presentation/hooks/finished-lotes/useDownloadFinishedLotesReport'
import type { FiltrosReporteLotesFinalizados } from '#/presentation/hooks/finished-lotes/useDownloadFinishedLotesReport'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

interface FinishedLotesReportButtonProps {
    clienteId: number
    nombreCliente?: string
    filtros?: FiltrosReporteLotesFinalizados
}


export function FinishedLotesReportButton({
    clienteId,
    nombreCliente,
    filtros,
}: FinishedLotesReportButtonProps) {
    const [dialogAbierto, setDialogAbierto] = useState(false)
    const { descargarReporte, generando } = useDownloadFinishedLotesReport()

    const descargar = (formato: ReportFormat) => {
        setDialogAbierto(false)
        void descargarReporte({ clienteId, formato, nombreCliente, filtros })
    }

    return (
        <>
            <CustomButton
                fullWidth={false}
                icon={<Download className="size-4" />}
                isLoading={generando}
                onClick={() => setDialogAbierto(true)}
            >
                {generando ? 'Generando reporte…' : 'Descargar Reporte de lotes finalizados.'}
            </CustomButton>

            <DownloadFormatDialog
                open={dialogAbierto}
                onOpenChange={setDialogAbierto}
                title="Descargar reporte de lotes finalizados"
                description={
                    nombreCliente
                        ? `Elegí en qué formato querés el reporte de ${nombreCliente}.`
                        : 'Elegí en qué formato querés el reporte.'
                }
                onSelectFormat={descargar}
                isPending={generando}
            />
        </>
    )
}
