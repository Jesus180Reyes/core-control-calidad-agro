import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosOrigenes } from '#/presentation/hooks/catalogos/useGetCatalogosOrigenes'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import {
    countActiveFilters,
    filtrosLotesFinalizadosSchema,
    type FiltrosLotesFinalizados,
} from '#/presentation/schema/finished-lotes/filtrosLotesFinalizadosSchema'

interface FinishedLotesFiltersBarProps {
    filtros: FiltrosLotesFinalizados
    onApply: (filtros: FiltrosLotesFinalizados) => void
}

export function FinishedLotesFiltersBar({ filtros, onApply }: FinishedLotesFiltersBarProps) {
    const { productos } = useGetCatalogosProductos()
    const { origenes } = useGetCatalogosOrigenes()
    const form = useForm<FiltrosLotesFinalizados>({ defaultValues: filtros })

    useEffect(() => {
        form.reset(filtros)
    }, [filtros])

    const filtrosActivos = countActiveFilters(filtros)

    const desde = useWatch({ control: form.control, name: 'desde' })
    const hasta = useWatch({ control: form.control, name: 'hasta' })

    const limpiar = () => {
        form.reset({})
        onApply({})
    }

    const aplicar = form.handleSubmit((valores) => {
        const resultado = filtrosLotesFinalizadosSchema.safeParse(valores)

        if (!resultado.success) {
            resultado.error.issues.forEach((issue) => {
                const campo = issue.path[0] as keyof FiltrosLotesFinalizados
                form.setError(campo, { message: issue.message })
            })
            return
        }

        onApply(resultado.data)
    })

    return (
        <form
            onSubmit={aplicar}
            aria-label="Filtros de lotes finalizados"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá los lotes por nombre, producto, origen o fecha de finalización."
                icon={<SlidersHorizontal className="size-4.5" />}
                badge={
                    filtrosActivos > 0
                        ? `${filtrosActivos} ${filtrosActivos === 1 ? 'filtro activo' : 'filtros activos'}`
                        : undefined
                }
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                <ControlledInput
                    control={form.control}
                    name="nombre"
                    label="Nombre de lote"
                    placeholder="Buscar por nombre de lote..."
                    icon={<Search className="size-4" />}
                    className="sm:col-span-2"
                    uppercase
                />
                <ControlledSelector
                    control={form.control}
                    name="producto_id"
                    label="Producto"
                    placeholder="Todos los productos"
                    valueAsNumber
                    options={productos.map((producto) => ({
                        value: producto.id,
                        label: producto.nombre,
                    }))}
                />
                <ControlledSelector
                    control={form.control}
                    name="origen_id"
                    label="Origen"
                    placeholder="Todos los orígenes"
                    valueAsNumber
                    options={origenes.map((origen) => ({
                        value: origen.id,
                        label: origen.nombre,
                    }))}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="desde"
                    label="Finalizado desde"
                    placeholder="Cualquier fecha"
                    maxDate={hasta || new Date()}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="hasta"
                    label="Finalizado hasta"
                    placeholder="Cualquier fecha"
                    minDate={desde}
                    maxDate={new Date()}
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
