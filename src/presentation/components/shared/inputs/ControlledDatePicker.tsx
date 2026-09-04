import { useState, type ReactNode } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import {
    type Control,
    type ControllerRenderProps,
    Controller,
    type FieldError as FieldErrorType,
    type FieldPath,
    type FieldValues,
} from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FieldError } from '#/presentation/components/shared/inputs/FieldError'

interface ControlledDatePickerProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    label?: string
    placeholder?: string
    className?: string
    icon?: ReactNode
    disabled?: boolean
    /** Fecha mínima seleccionable, inclusive. */
    minDate?: Date
    /** Fecha máxima seleccionable, inclusive. */
    maxDate?: Date
    /** Agrega el botón para volver el campo a vacío. */
    clearable?: boolean
}

/**
 * Campo de fecha: un `Popover` con el calendario de shadcn adentro.
 *
 * Guarda un `Date` en el form, no el `'YYYY-MM-DD'` del `<input type="date">`,
 * porque los schemas del proyecto declaran las fechas con `z.coerce.date()` y
 * un input nativo no sabe pintar el `Date` que le vuelve en un `reset`.
 */
export function ControlledDatePicker<TFieldValues extends FieldValues>({
    name,
    control,
    label,
    placeholder = 'Seleccionar fecha',
    className = '',
    icon = <CalendarIcon className="size-4" />,
    disabled = false,
    minDate,
    maxDate,
    clearable = true,
}: ControlledDatePickerProps<TFieldValues>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <DatePickerField
                    field={field}
                    error={error}
                    label={label}
                    placeholder={placeholder}
                    className={className}
                    icon={icon}
                    disabled={disabled}
                    minDate={minDate}
                    maxDate={maxDate}
                    clearable={clearable}
                />
            )}
        />
    )
}

interface DatePickerFieldProps<TFieldValues extends FieldValues> {
    field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>
    error?: FieldErrorType
    label?: string
    placeholder: string
    className: string
    icon?: ReactNode
    disabled: boolean
    minDate?: Date
    maxDate?: Date
    clearable: boolean
}

// El estado del panel vive en un componente aparte y no en el `render` del
// `Controller`, que es una función y no puede tener hooks.
function DatePickerField<TFieldValues extends FieldValues>({
    field,
    error,
    label,
    placeholder,
    className,
    icon,
    disabled,
    minDate,
    maxDate,
    clearable,
}: DatePickerFieldProps<TFieldValues>) {
    const [abierto, setAbierto] = useState(false)

    const { name, value, onChange, onBlur, ref } = field
    const idError = `${name}-error`
    const fecha = aFecha(value)

    // `disabled` del calendario recibe rangos, no fechas sueltas.
    const fueraDeRango =
        minDate || maxDate ? { before: minDate as Date, after: maxDate as Date } : undefined

    const limpiar = () => {
        onChange(undefined)
        setAbierto(false)
    }

    return (
        // `group` habilita que label e ícono reaccionen al foco del campo.
        <div className={`group space-y-1.5 w-full ${className}`}>
            {label && (
                <Label
                    htmlFor={name}
                    className={`text-[11px] font-bold tracking-wider uppercase transition-colors duration-200 ${
                        error ? 'text-rose-500' : 'text-text-muted group-focus-within:text-brand'
                    }`}
                >
                    {label}
                </Label>
            )}

            <Popover
                open={abierto}
                onOpenChange={(estado) => {
                    setAbierto(estado)
                    // Al cerrar, el campo pasa a tocado: sin esto un `mode: 'onTouched'`
                    // no validaría nunca este campo.
                    if (!estado) onBlur()
                }}
            >
                <PopoverTrigger
                    id={name}
                    ref={ref}
                    type="button"
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? idError : undefined}
                    className={[
                        'relative flex h-11 w-full items-center gap-2 rounded-xl px-3.5 text-left text-sm font-medium',
                        'bg-bg-app border border-border-ui text-text-main',
                        'transition-[color,background-color,border-color,box-shadow] duration-200',
                        'hover:border-brand/30',
                        'focus-visible:bg-surface focus-visible:border-brand/60 focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:outline-none',
                        'aria-invalid:border-rose-500/70 aria-invalid:ring-rose-500/15 dark:aria-invalid:border-rose-500/60',
                        'disabled:cursor-not-allowed disabled:opacity-60',
                        'data-[popup-open]:bg-surface data-[popup-open]:border-brand/60',
                    ].join(' ')}
                >
                    {icon && (
                        <span className="flex items-center text-text-muted/70 transition-colors duration-200 group-focus-within:text-brand">
                            {icon}
                        </span>
                    )}
                    {fecha ? (
                        <span className="truncate">{format(fecha, 'PPP', { locale: es })}</span>
                    ) : (
                        <span className="truncate font-normal text-text-muted/60">
                            {placeholder}
                        </span>
                    )}
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={6}
                    className="w-auto gap-0 rounded-xl border border-border-ui bg-surface p-0 shadow-clay-card"
                >
                    <Calendar
                        mode="single"
                        locale={es}
                        autoFocus
                        selected={fecha}
                        defaultMonth={fecha}
                        disabled={fueraDeRango}
                        onSelect={(elegida) => {
                            onChange(elegida)
                            setAbierto(false)
                        }}
                        className="p-3"
                    />

                    {clearable && fecha && (
                        <div className="border-t border-border-ui/70 p-2">
                            <button
                                type="button"
                                onClick={limpiar}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-brand/10 hover:text-brand"
                            >
                                <X className="size-3.5" />
                                Limpiar fecha
                            </button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            <FieldError id={idError} message={error?.message} />
        </div>
    )
}

/**
 * El valor del form puede llegar como `Date` (lo que guarda este campo), como
 * string ISO (un search param ya parseado) o vacío. Una fecha inválida cuenta
 * como vacío: es preferible el placeholder a un "Invalid Date" en pantalla.
 */
function aFecha(valor: unknown): Date | undefined {
    if (valor == null || valor === '') return undefined

    const fecha = valor instanceof Date ? valor : new Date(valor as string | number)

    return Number.isNaN(fecha.getTime()) ? undefined : fecha
}
