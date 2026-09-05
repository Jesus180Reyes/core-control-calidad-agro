import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import {
    filtrosClientesSchema,
    type FiltrosClientes,
} from '#/presentation/schema/inspeccion-clientes/filtrosClientesSchema'

function contarFiltrosActivos(filtros: FiltrosClientes) {
    return Object.values(filtros).filter((valor) => valor !== undefined && valor !== '').length
}

interface ClientesFiltersBarProps {
    filtros: FiltrosClientes
    onApply: (filtros: FiltrosClientes) => void
}

export function ClientesFiltersBar({ filtros, onApply }: ClientesFiltersBarProps) {
    const { productos } = useGetCatalogosProductos()
    const form = useForm<FiltrosClientes>({ defaultValues: filtros })
    useEffect(() => {
        form.reset(filtros)
    }, [filtros])

    const filtrosActivos = contarFiltrosActivos(filtros)

    const limpiar = () => {
        form.reset({})
        onApply({})
    }

    return (
        <form
            onSubmit={form.handleSubmit((valores) => onApply(filtrosClientesSchema.parse(valores)))}
            aria-label="Filtros de los clientes"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá los clientes por nombre, producto, código de exportación o RTN."
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
                    label="Nombre del cliente"
                    placeholder="Buscar por nombre..."
                    icon={<Search className="size-4" />}
                    className="sm:col-span-2"
                />
                <ControlledSelector
                    control={form.control}
                    name="producto_id"
                    label="Producto"
                    placeholder="Todos los productos"
                    valueAsNumber
                    showSearch
                    className="sm:col-span-2"
                    options={productos.map((producto) => ({
                        value: producto.id,
                        label: producto.nombre,
                    }))}
                />
                <ControlledInput
                    control={form.control}
                    name="codigo_exportacion"
                    label="Código de exportación"
                    placeholder="Ej. EXP-001"
                />
                <ControlledInput
                    control={form.control}
                    name="rtn"
                    label="RTN"
                    placeholder="Ej. 08011999123456"
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
