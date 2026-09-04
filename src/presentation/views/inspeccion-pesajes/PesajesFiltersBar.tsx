import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosUsuarios } from '#/presentation/hooks/catalogos/useGetCatalogosUsuarios'
import {
    filtrosPesajesSchema,
    type FiltrosPesajes,
} from '#/presentation/schema/inspeccion-pesajes/filtrosPesajesSchema'

const FUERA_DE_RANGO_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'true', label: 'Sólo fuera de rango' },
    { value: 'false', label: 'Sólo dentro de rango' },
]

function contarFiltrosActivos(filtros: FiltrosPesajes) {
    return Object.values(filtros).filter((valor) => valor !== undefined).length
}

interface PesajesFiltersBarProps {
    filtros: FiltrosPesajes
    onApply: (filtros: FiltrosPesajes) => void
}

export function PesajesFiltersBar({ filtros, onApply }: PesajesFiltersBarProps) {
    const { usuarios } = useGetCatalogosUsuarios()
    const form = useForm<FiltrosPesajes>({ defaultValues: filtros })
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
            onSubmit={form.handleSubmit((valores) => onApply(filtrosPesajesSchema.parse(valores)))}
            aria-label="Filtros de los pesajes del lote"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá los pesajes del lote por usuario, fecha o estado."
                icon={<SlidersHorizontal className="size-4.5" />}
                badge={
                    filtrosActivos > 0
                        ? `${filtrosActivos} ${filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}`
                        : undefined
                }
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">

                <ControlledSelector
                    control={form.control}
                    name="usuario_id"
                    label="Usuario"
                    placeholder="Todos los usuarios"
                    valueAsNumber
                    showSearch
                    className="sm:col-span-2"
                    options={usuarios.map((usuario) => ({
                        value: usuario.id,
                        label: usuario.nombre,
                    }))}
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
