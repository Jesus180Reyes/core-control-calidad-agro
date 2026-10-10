import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { X } from 'lucide-react'
import { PeriodChips } from '#/presentation/components/metricas/PeriodChips'
import { ControlledDatePicker } from '#/presentation/components/shared/inputs/ControlledDatePicker'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { useGetCatalogosUsuarios } from '#/presentation/hooks/catalogos/useGetCatalogosUsuarios'
import { useClientInspection } from '#/presentation/hooks/inspeccion-clientes/useClientInspection'
import type { PeriodPreset, QualityMetricsFilters } from '#/presentation/hooks/metricas/qualityMetricsParams'

// Lo que vive en el form: el preset no, que es de los chips.
type FilterFormValues = Pick<QualityMetricsFilters, 'desde' | 'hasta' | 'cliente_id' | 'usuario_id'>

function toFormValues({ desde, hasta, cliente_id, usuario_id }: QualityMetricsFilters): FilterFormValues {
    return { desde, hasta, cliente_id, usuario_id }
}

interface RemovableChipProps {
    label: string
    value: string
    onRemove: () => void
}

function RemovableChip({ label, value, onRemove }: RemovableChipProps) {
    return (
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 py-1 pl-3 pr-1 text-xs font-semibold text-brand">
            <span className="truncate">
                {label}: {value}
            </span>
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Quitar el filtro de ${label.toLowerCase()}`}
                className="grid size-5 shrink-0 place-items-center rounded-full transition-colors outline-none hover:bg-brand/15 focus-visible:ring-2 focus-visible:ring-brand/60"
            >
                <X className="size-3" strokeWidth={2.5} />
            </button>
        </span>
    )
}

interface MetricsFilterBarProps {
    filters: QualityMetricsFilters
    onChange: (filters: QualityMetricsFilters) => void
}

/**
 * Período, cliente y operador del tablero. Aplica al cambiar, sin botón
 * Buscar: en un tablero cada filtro es un click y la respuesta llega rápido.
 */
export function MetricsFilterBar({ filters, onChange }: MetricsFilterBarProps) {
    // Sin página: los selectores necesitan la lista completa (SPEC 12).
    const { clientes } = useClientInspection()
    const { usuarios } = useGetCatalogosUsuarios()

    const form = useForm<FilterFormValues>({ defaultValues: toFormValues(filters) })

    // Los filtros también cambian desde afuera (click en una fila de la tabla,
    // quitar un chip): el form los sigue.
    useEffect(() => {
        form.reset(toFormValues(filters))
    }, [filters])

    // Cada cambio de un campo se aplica en el momento. El `reset` de arriba
    // también notifica, pero sin `type`, y así no rebota.
    useEffect(() => {
        const suscripcion = form.watch((valores, { type }) => {
            if (type !== 'change') return

            const custom = filters.preset === 'custom'
            onChange({
                preset: filters.preset,
                desde: custom ? valores.desde : undefined,
                hasta: custom ? valores.hasta : undefined,
                cliente_id: valores.cliente_id,
                usuario_id: valores.usuario_id,
            })
        })

        return () => suscripcion.unsubscribe()
    }, [form, filters.preset, onChange])

    const desde = useWatch({ control: form.control, name: 'desde' })
    const hasta = useWatch({ control: form.control, name: 'hasta' })

    // Al salir de Personalizado, el rango a mano se descarta: si quedara en el
    // estado, volver a Personalizado lo reaplicaría sin que se vea de dónde salió.
    const handlePresetChange = (preset: PeriodPreset) => {
        if (preset === filters.preset) return
        onChange({ ...filters, preset, desde: undefined, hasta: undefined })
    }

    const clienteActivo =
        filters.cliente_id === undefined
            ? undefined
            : clientes.find((cliente) => cliente.id === filters.cliente_id)?.nombre ??
              `Cliente #${filters.cliente_id}`

    const operadorActivo =
        filters.usuario_id === undefined
            ? undefined
            : usuarios.find((usuario) => usuario.id === filters.usuario_id)?.nombre ??
              `Operador #${filters.usuario_id}`

    return (
        <section
            aria-label="Filtros de las métricas"
            className="space-y-4 rounded-[28px] border border-border-ui/60 bg-surface p-5 shadow-clay-card sm:p-6"
        >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <PeriodChips value={filters.preset} onChange={handlePresetChange} />

                <div className="grid gap-4 sm:grid-cols-2 xl:w-[30rem] xl:shrink-0">
                    <ControlledSelector
                        control={form.control}
                        name="cliente_id"
                        label="Cliente"
                        placeholder="Todos los clientes"
                        valueAsNumber
                        showSearch
                        options={clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre }))}
                    />
                    <ControlledSelector
                        control={form.control}
                        name="usuario_id"
                        label="Operador"
                        placeholder="Todos los operadores"
                        valueAsNumber
                        showSearch
                        options={usuarios.map((usuario) => ({ value: usuario.id, label: usuario.nombre }))}
                    />
                </div>
            </div>

            {filters.preset === 'custom' && (
                <div className="grid gap-4 animate-in fade-in duration-300 sm:max-w-xl sm:grid-cols-2">
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
                        placeholder="Hoy"
                        minDate={desde}
                        maxDate={new Date()}
                    />
                </div>
            )}

            {(clienteActivo || operadorActivo) && (
                <div className="flex flex-wrap gap-2">
                    {clienteActivo && (
                        <RemovableChip
                            label="Cliente"
                            value={clienteActivo}
                            onRemove={() => onChange({ ...filters, cliente_id: undefined })}
                        />
                    )}
                    {operadorActivo && (
                        <RemovableChip
                            label="Operador"
                            value={operadorActivo}
                            onRemove={() => onChange({ ...filters, usuario_id: undefined })}
                        />
                    )}
                </div>
            )}
        </section>
    )
}
