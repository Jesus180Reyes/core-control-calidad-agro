import { useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FieldError } from '#/presentation/components/shared/inputs/FieldError'

interface SelectOption {
    value: number
    label: string
}

interface ControlledSelectorProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    label?: string
    placeholder?: string
    options: SelectOption[]
    className?: string
    icon?: ReactNode
    disabled?: boolean
    /** Agrega un buscador arriba de las opciones. Conviene desde ~10 opciones. */
    showSearch?: boolean
    searchPlaceholder?: string
    emptyMessage?: string
    /** Para selects de ids: guarda el valor como número en vez de string. */
    valueAsNumber?: boolean
}

export function ControlledSelector<TFieldValues extends FieldValues>({
    name,
    control,
    label,
    placeholder = 'Seleccionar...',
    options,
    className = '',
    icon,
    disabled = false,
    showSearch = false,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Sin resultados',
    valueAsNumber = false
}: ControlledSelectorProps<TFieldValues>) {
    const [busqueda, setBusqueda] = useState('')

    const termino = busqueda.trim().toLowerCase()
    const visibles = showSearch && termino
        ? options.filter((opt) => opt.label.toLowerCase().includes(termino))
        : options

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => {
                const idError = `${name}-error`
                const valorActual = field.value == null ? '' : String(field.value)
                const seleccionada = options.find((opt) => opt.value === Number(valorActual))

                return (
                    // `group` habilita que label e ícono reaccionen al foco del campo.
                    <div className={`group space-y-1.5 w-full ${className}`}>
                        {label && (
                            <Label
                                htmlFor={name}
                                className={`text-[11px] font-bold tracking-wider uppercase transition-colors duration-200 ${error
                                    ? 'text-rose-500'
                                    : 'text-text-muted group-focus-within:text-brand'
                                    }`}
                            >
                                {label}
                            </Label>
                        )}

                        <Select
                            onValueChange={(valor) => {
                                // La primitiva puede devolver `null` al limpiar; sin esta
                                // rama `Number(null)` guardaría un 0 que parece un id válido.
                                if (valor == null || valor === '') {
                                    field.onChange(undefined)
                                    return
                                }

                                field.onChange(valueAsNumber ? Number(valor) : valor)
                            }}
                            value={valorActual}
                            disabled={disabled}
                            // Cada apertura arranca con la lista completa.
                            onOpenChange={(abierto) => { if (!abierto) setBusqueda('') }}
                        >
                            <SelectTrigger
                                id={name}
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? idError : undefined}
                                className={[
                                    // El alto de la primitiva viene con variante (`data-[size=default]:h-8`):
                                    // hay que pisarlo con la misma variante, no con un `h-11` suelto.
                                    // Queda en `auto` porque el valor elegido ocupa dos líneas.
                                    'relative w-full data-[size=default]:h-auto min-h-11 rounded-xl px-3.5 py-2 text-sm font-medium',
                                    'bg-bg-app dark:bg-bg-app border border-border-ui text-text-main',
                                    'data-placeholder:font-normal data-placeholder:text-text-muted/60',
                                    'transition-[color,background-color,border-color,box-shadow] duration-200',
                                    'hover:border-brand/30 dark:hover:bg-bg-app',
                                    'focus-visible:bg-surface focus-visible:border-brand/60 focus-visible:ring-4 focus-visible:ring-brand/15',
                                    'aria-invalid:border-rose-500/70 aria-invalid:ring-rose-500/15 dark:aria-invalid:border-rose-500/60',
                                    '[&_svg]:text-text-muted/70 group-focus-within:[&_svg]:text-brand',
                                    // La flecha gira mientras el panel está abierto.
                                    '[&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 data-[popup-open]:[&>svg:last-child]:rotate-180',
                                    icon ? 'pl-10' : ''
                                ].join(' ')}
                            >
                                {icon && (
                                    <span className="absolute inset-y-0 left-3.5 flex items-center text-text-muted/70 transition-colors duration-200 group-focus-within:text-brand pointer-events-none">
                                        {icon}
                                    </span>
                                )}
                                {/*
                                  El valor no se pinta con `SelectValue`: mostramos el label
                                  arriba y el value debajo, que es lo que confirma la elección.
                                */}
                                <SelectValue>
                                    {seleccionada ? (
                                        <span className="flex min-w-0 flex-col text-left leading-tight">
                                            <span className="truncate text-sm font-semibold text-text-main">
                                                {seleccionada.label}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="font-normal text-text-muted/60">
                                            {placeholder}
                                        </span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>

                            {/*
                              `alignItemWithTrigger` es `true` por defecto y la primitiva
                              apaga la animación en ese modo (`data-[align-trigger=true]:animate-none`):
                              en `false` el panel entra deslizándose.
                            */}
                            <SelectContent
                                alignItemWithTrigger={false}
                                align="start"
                                sideOffset={6}
                                className="rounded-xl border border-border-ui bg-surface p-1 shadow-clay-card duration-200 ease-out"
                            >
                                {showSearch && (
                                    <div className="sticky top-0 z-10 mb-1 bg-surface px-1 pt-1 pb-2">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-text-muted/70" />
                                            <input
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                                // El select trae su propio typeahead: sin esto se
                                                // come las teclas y el campo no escribe. Las de
                                                // navegación sí siguen siendo suyas.
                                                onKeyDown={(e) => {
                                                    const navegacion = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab']
                                                    if (!navegacion.includes(e.key)) e.stopPropagation()
                                                }}
                                                placeholder={searchPlaceholder}
                                                className="h-9 w-full rounded-lg border border-border-ui bg-bg-app pl-9 pr-3 text-sm font-medium text-text-main outline-none transition-colors placeholder:font-normal placeholder:text-text-muted/60 focus:border-brand/60"
                                            />
                                        </div>
                                    </div>
                                )}

                                {visibles.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                        className="rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-text-main transition-colors duration-150 focus:bg-brand/10 focus:text-brand data-highlighted:bg-brand/10 data-highlighted:text-brand"
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}

                                {visibles.length === 0 && (
                                    <p className="py-6 text-center text-sm text-text-muted">
                                        {emptyMessage}
                                    </p>
                                )}
                            </SelectContent>
                        </Select>

                        <FieldError id={idError} message={error?.message} />
                    </div>
                )
            }}
        />
    )
}
