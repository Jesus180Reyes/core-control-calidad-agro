import { type Control, useWatch } from 'react-hook-form'
import { RotateCcw } from 'lucide-react'

import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import type { FiltrosReporteLotesFinalizados } from '#/presentation/schema/reportes/filtrosReporteLotesFinalizadosSchema'

interface FinishedLotesReportFiltersProps {
    control: Control<FiltrosReporteLotesFinalizados>
    onClear: () => void
    disabled?: boolean
}

/**
 * Rango de fechas del reporte, sobre la fecha de finalización del lote. Ambos
 * extremos son opcionales e inclusivos: sin ninguno, el reporte sale completo.
 */
export function FinishedLotesReportFilters({
    control,
    onClear,
    disabled = false,
}: FinishedLotesReportFiltersProps) {
    const desde = useWatch({ control, name: 'desde' })
    const hasta = useWatch({ control, name: 'hasta' })

    const hayFiltros = Boolean(desde || hasta)

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold tracking-wider uppercase text-text-muted">
                    Fecha de finalización
                </p>

                {hayFiltros && (
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={disabled}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RotateCcw className="size-3.5" />
                        Limpiar filtros
                    </button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <ControlledDatePicker
                    control={control}
                    name="desde"
                    label="Desde"
                    placeholder="Cualquier fecha"
                    disabled={disabled}
                    maxDate={hasta || new Date()}
                />
                <ControlledDatePicker
                    control={control}
                    name="hasta"
                    label="Hasta"
                    placeholder="Cualquier fecha"
                    disabled={disabled}
                    minDate={desde}
                    maxDate={new Date()}
                />
            </div>

            <p className="text-[11px] font-medium text-text-muted">
                Sin fechas, el reporte incluye todos los lotes finalizados del cliente.
            </p>
        </div>
    )
}
