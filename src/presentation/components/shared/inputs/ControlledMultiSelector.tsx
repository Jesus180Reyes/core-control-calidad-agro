import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { ChevronsUpDown } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { FieldError } from '#/presentation/components/shared/inputs/FieldError'

type MultiSelectValue = string | number

interface MultiSelectOption {
    value: MultiSelectValue
    label: string
}

interface ControlledMultiSelectorProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    options: MultiSelectOption[]
    label?: string
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
}

/** Selector de varias opciones: el campo guarda un array con los `value` elegidos. */
export function ControlledMultiSelector<TFieldValues extends FieldValues>({
    name,
    control,
    options,
    label,
    placeholder = 'Seleccionar...',
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Sin resultados',
    className = '',
}: ControlledMultiSelectorProps<TFieldValues>) {
    const [abierto, setAbierto] = useState(false)

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => {
                const seleccionados: MultiSelectValue[] = field.value ?? []
                const idError = `${name}-error`

                const alternar = (valor: MultiSelectValue) => {
                    field.onChange(
                        seleccionados.includes(valor)
                            ? seleccionados.filter((actual) => actual !== valor)
                            : [...seleccionados, valor],
                    )
                }

                const elegidas = options.filter((opcion) => seleccionados.includes(opcion.value))

                return (
                    <div className={`group space-y-1.5 w-full ${className}`}>
                        {label && (
                            <Label
                                className={`text-[11px] font-bold tracking-wider uppercase transition-colors duration-200 ${error ? 'text-rose-500' : 'text-text-muted group-focus-within:text-brand'
                                    }`}
                            >
                                {label}
                            </Label>
                        )}

                        <Popover open={abierto} onOpenChange={setAbierto}>
                            <PopoverTrigger
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? idError : undefined}
                                className={[
                                    'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-left text-sm font-medium',
                                    'bg-bg-app border border-border-ui text-text-main',
                                    'transition-[color,background-color,border-color,box-shadow] duration-200',
                                    'hover:border-brand/30 focus-visible:border-brand/60 focus-visible:ring-4 focus-visible:ring-brand/15 outline-none',
                                    'aria-invalid:border-rose-500/70 aria-invalid:ring-rose-500/15',
                                    // La flecha gira mientras el panel está abierto.
                                    '[&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 data-popup-open:[&>svg:last-child]:rotate-180',
                                ].join(' ')}
                            >
                                {elegidas.length === 0 ? (
                                    <span className="font-normal text-text-muted/60">{placeholder}</span>
                                ) : (
                                    <span className="flex flex-wrap gap-1">
                                        {elegidas.map((opcion) => (
                                            <span
                                                key={opcion.value}
                                                className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand animate-in fade-in-0 zoom-in-95 duration-150"
                                            >
                                                {opcion.label}
                                            </span>
                                        ))}
                                    </span>
                                )}

                                <ChevronsUpDown className="size-4 shrink-0 text-text-muted/70" />
                            </PopoverTrigger>

                            <PopoverContent
                                align="start"
                                sideOffset={6}
                                className="w-(--anchor-width) rounded-xl border border-border-ui bg-surface p-0 shadow-clay-card duration-200 ease-out"
                            >
                                <Command>
                                    <CommandInput placeholder={searchPlaceholder} />
                                    <CommandList>
                                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                                        <CommandGroup>
                                            {options.map((opcion) => (
                                                <CommandItem
                                                    key={opcion.value}
                                                    value={opcion.label}
                                                    data-checked={seleccionados.includes(opcion.value)}
                                                    onSelect={() => alternar(opcion.value)}
                                                >
                                                    {opcion.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <FieldError id={idError} message={error?.message} />
                    </div>
                )
            }}
        />
    )
}
