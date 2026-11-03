import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosRoles } from '#/presentation/hooks/catalogos/useGetCatalogosRoles'
import {
    filtrosUsuariosSchema,
    type FiltrosUsuarios,
} from '#/presentation/schema/soporte/filtrosUsuariosSchema'

function countActiveFilters(filtros: FiltrosUsuarios) {
    return Object.values(filtros).filter((valor) => valor !== undefined).length
}

interface SupportUsersFiltersBarProps {
    filtros: FiltrosUsuarios
    onApply: (filtros: FiltrosUsuarios) => void
}

export function SupportUsersFiltersBar({ filtros, onApply }: SupportUsersFiltersBarProps) {
    const { roles } = useGetCatalogosRoles()
    const form = useForm<FiltrosUsuarios>({ defaultValues: filtros })
    useEffect(() => {
        form.reset(filtros)
    }, [filtros])

    const activeFilters = countActiveFilters(filtros)

    const clear = () => {
        form.reset({})
        onApply({})
    }

    return (
        <form
            onSubmit={form.handleSubmit((valores) => onApply(filtrosUsuariosSchema.parse(valores)))}
            aria-label="Filtros de los usuarios"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá los usuarios por nombre, cédula o rol."
                icon={<SlidersHorizontal className="size-4.5" />}
                badge={
                    activeFilters > 0
                        ? `${activeFilters} ${activeFilters === 1 ? 'filtro activo' : 'filtros activos'}`
                        : undefined
                }
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                <ControlledInput
                    control={form.control}
                    name="nombre"
                    label="Nombre"
                    placeholder="Buscar por nombre..."
                    icon={<Search className="size-4" />}
                    className="sm:col-span-2"
                />
                <ControlledInput
                    control={form.control}
                    name="cedula"
                    label="Cédula"
                    placeholder="Ej. 0801199912345"
                />
                <ControlledSelector
                    control={form.control}
                    name="rol_id"
                    label="Rol"
                    placeholder="Todos los roles"
                    valueAsNumber
                    options={roles.map((rol) => ({
                        value: rol.id,
                        label: rol.nombre,
                    }))}
                />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border-ui/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    disabled={activeFilters === 0}
                    onClick={clear}
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
