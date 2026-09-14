import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useClientInspection } from '#/presentation/hooks/inspeccion-clientes/useClientInspection'
import {
    filtrosDocumentosFiscalesSchema,
    type FiltrosDocumentosFiscales,
} from '#/presentation/schema/documentos-fiscales/filtrosDocumentosFiscalesSchema'

function contarFiltrosActivos(filtros: FiltrosDocumentosFiscales) {
    return Object.values(filtros).filter((valor) => valor !== undefined).length
}

interface DocumentosFiscalesFiltersBarProps {
    filtros: FiltrosDocumentosFiscales
    onApply: (filtros: FiltrosDocumentosFiscales) => void
}

export function DocumentosFiscalesFiltersBar({
    filtros,
    onApply,
}: DocumentosFiscalesFiltersBarProps) {
    const { clientes } = useClientInspection()
    const form = useForm<FiltrosDocumentosFiscales>({ defaultValues: filtros })
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
            onSubmit={form.handleSubmit((valores) =>
                onApply(filtrosDocumentosFiscalesSchema.parse(valores)),
            )}
            aria-label="Filtros de los documentos fiscales"
            className="rounded-2xl border border-border-ui bg-surface shadow-clay-card"
        >
            <SectionCardHeader
                title="Filtros"
                description="Acotá los documentos por cliente o por rango de emisión."
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
                    name="cliente_id"
                    label="Cliente"
                    placeholder="Todos los clientes"
                    valueAsNumber
                    showSearch
                    className="sm:col-span-2"
                    options={clientes.map((cliente) => ({
                        value: cliente.id,
                        label: cliente.nombre,
                    }))}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="desde"
                    label="Emitido desde"
                    placeholder="Cualquier fecha"
                    maxDate={hasta || new Date()}
                />
                <ControlledDatePicker
                    control={form.control}
                    name="hasta"
                    label="Emitido hasta"
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
