import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import {
    filtrosHistorialSchema,
    type FiltrosHistorial,
} from '#/presentation/schema/historial/filtrosHistorialSchema'

const FUERA_DE_RANGO_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'true', label: 'Sólo fuera de rango' },
    { value: 'false', label: 'Sólo dentro de rango' },
]

/** Cuántos filtros están aplicados hoy; alimenta el badge y habilita "Limpiar". */
function contarFiltrosActivos(filtros: FiltrosHistorial) {
    return Object.values(filtros).filter((valor) => valor !== undefined && valor !== '').length
}

interface HistorialFiltersBarProps {
    filtros: FiltrosHistorial
    onApply: (filtros: FiltrosHistorial) => void
}

export function HistorialFiltersBar({ filtros, onApply }: HistorialFiltersBarProps) {
    const form = useForm<FiltrosHistorial>({ defaultValues: filtros })
    useEffect(() => {
        form.reset(filtros)
    }, [filtros])

    const filtrosActivos = contarFiltrosActivos(filtros)

    const desde = useWatch({ control: form.control, name: 'desde' })
    const hasta = useWatch({ control: form.control, name: 'hasta' })

    const limpiar = () => {
        form.reset({})
        onApply({})
    }

    return (
        <form
            onSubmit={form.handleSubmit((valores) => onApply(filtrosHistorialSchema.parse(valores)))}
            aria-label="Filtros del historial de pesajes"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá el historial por lote, cliente, fecha o estado."
                icon={<SlidersHorizontal className="size-[18px]" />}
                badge={
                    filtrosActivos > 0
                        ? `${filtrosActivos} ${filtrosActivos === 1 ? 'activo' : 'activos'}`
                        : undefined
                }
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                <ControlledInput
                    control={form.control}
                    name="nombre"
                    label="Nombre"
                    placeholder="Buscar por nombre de lote..."
                    icon={<Search className="size-4" />}
                    className="sm:col-span-2"
                />
                <ControlledInput
                    control={form.control}
                    name="lote_id"
                    label="ID de lote"
                    type="number"
                    placeholder="Ej. 128"
                    valueAsNumber
                />
                <ControlledInput
                    control={form.control}
                    name="cliente_id"
                    label="ID de cliente"
                    type="number"
                    placeholder="Ej. 7"
                    valueAsNumber
                />
                <ControlledDatePicker
                    control={form.control}
                    name="desde"
                    label="Desde"
                    placeholder="Cualquier fecha"
                    maxDate={hasta || new Date()}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="hasta"
                    label="Hasta"
                    placeholder="Cualquier fecha"
                    minDate={desde}
                    maxDate={new Date()}
                />
                <ControlledSelector
                    control={form.control}
                    name="fuera_de_rango"
                    label="Fuera de rango"
                    placeholder="Todos"
                    options={FUERA_DE_RANGO_OPTIONS}
                />
                <ControlledInput
                    control={form.control}
                    name="estado_calidad_id"
                    label="ID de estado de calidad"
                    type="number"
                    placeholder="Ej. 1"
                    valueAsNumber
                />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border-ui/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    disabled={filtrosActivos === 0}
                    onClick={limpiar}
                    icon={<RotateCcw className="size-4" />}
                >
                    Limpiar Filtros
                </CustomButton>
                {/* El primary trae `py-4.5 lg:py-5`; se iguala al secondary para que
                    los dos botones midan lo mismo puestos en fila. */}
                <CustomButton
                    type="submit"
                    fullWidth={false}
                    className="py-4 text-xs lg:py-4 lg:text-sm"
                    icon={<Search className="size-4" />}
                >
                    Buscar
                </CustomButton>
            </div>
        </form>
    )
}
