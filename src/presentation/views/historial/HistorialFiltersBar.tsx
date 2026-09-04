import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RotateCcw, Search } from 'lucide-react'

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

interface HistorialFiltersBarProps {
    filtros: FiltrosHistorial
    onApply: (filtros: FiltrosHistorial) => void
}

export function HistorialFiltersBar({ filtros, onApply }: HistorialFiltersBarProps) {
    const form = useForm<FiltrosHistorial>({ defaultValues: filtros })
    useEffect(() => {
        form.reset(filtros)
    }, [filtros])

    const desde = useWatch({ control: form.control, name: 'desde' })
    const hasta = useWatch({ control: form.control, name: 'hasta' })

    const limpiar = () => {
        form.reset({})
        onApply({})
    }

    return (
        <form
            onSubmit={form.handleSubmit((valores) => onApply(filtrosHistorialSchema.parse(valores)))}
            className="space-y-5 rounded-2xl border border-border-ui bg-surface p-5 shadow-clay-card sm:p-6"
        >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    maxDate={hasta}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="hasta"
                    label="Hasta"
                    placeholder="Cualquier fecha"
                    minDate={desde}
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

            <div className="flex flex-col-reverse gap-3 border-t border-border-ui/70 pt-4 sm:flex-row sm:justify-end">
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    onClick={limpiar}
                    icon={<RotateCcw className="size-4" />}
                >
                    Limpiar Filtros
                </CustomButton>
                <CustomButton type="submit" fullWidth={false} icon={<Search className="size-4" />}>
                    Buscar
                </CustomButton>
            </div>
        </form>
    )
}
