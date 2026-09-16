import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Download } from 'lucide-react'

import { FinishedLotesReportFilters } from '#/presentation/components/lotes/FinishedLotesReportFilters'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { DownloadFormatDialog } from '#/presentation/components/shared/dialog/DownloadFormatDialog'
import { useDownloadFinishedLotesReport } from '#/presentation/hooks/finished-lotes/useDownloadFinishedLotesReport'
import type { FiltrosReporteLotesFinalizados } from '#/presentation/schema/reportes/filtrosReporteLotesFinalizadosSchema'
import type { ReportFormat } from '#/presentation/types/reportes/reportes.types'

interface FinishedLotesReportButtonProps {
    clienteId: number
    nombreCliente?: string
}


export function FinishedLotesReportButton({
    clienteId,
    nombreCliente,
}: FinishedLotesReportButtonProps) {
    const [dialogAbierto, setDialogAbierto] = useState(false)
    const { descargarReporte, generando } = useDownloadFinishedLotesReport()

    const { control, getValues, reset } = useForm<FiltrosReporteLotesFinalizados>({
        reValidateMode: 'onChange',
        values: {
            cliente_id: clienteId,
        }
    })

    const descargar = (formato: ReportFormat) => {
        setDialogAbierto(false);
        void descargarReporte({
            formato,
            filtros: getValues(),
        });
        reset();
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
                        ? `Filtrá por fecha y elegí en qué formato querés el reporte de ${nombreCliente}.`
                        : 'Filtrá por fecha y elegí en qué formato querés el reporte.'
                }
                filters={
                    <FinishedLotesReportFilters
                        control={control}
                        onClear={() => reset()}
                        disabled={generando}
                    />
                }
                onSelectFormat={descargar}
                isPending={generando}
            />
        </>
    )
}
