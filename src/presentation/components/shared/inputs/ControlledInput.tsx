import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Controller, type FieldPath, type FieldValues, type Control } from 'react-hook-form'

interface ControlledInputProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    label?: string
    placeholder?: string
    type?: string
    className?: string
    icon?: React.ReactNode
    accionDerecha?: React.ReactNode
    uppercase?: boolean
    disabled?: boolean
    autoComplete?: string
}

export function ControlledInput<TFieldValues extends FieldValues>({
    name,
    control,
    label,
    placeholder,
    type = 'text',
    className = '',
    icon,
    accionDerecha,
    uppercase = false,
    disabled = false,
    autoComplete
}: ControlledInputProps<TFieldValues>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => {
                const idError = `${name}-error`

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
                        <div className="relative">
                            {icon && (
                                <span className="absolute inset-y-0 left-3.5 flex items-center text-text-muted/70 transition-colors duration-200 group-focus-within:text-brand pointer-events-none">
                                    {icon}
                                </span>
                            )}
                            <Input
                                {...field}
                                onChange={(e) => field.onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
                                id={name}
                                type={type}
                                placeholder={placeholder}
                                value={field.value ?? ''}
                                disabled={disabled}
                                autoComplete={autoComplete}
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? idError : undefined}
                                className={[
                                    'h-11 w-full rounded-xl px-3.5 text-sm font-medium',
                                    'bg-bg-app dark:bg-bg-app border border-border-ui text-text-main',
                                    'placeholder:font-normal placeholder:text-text-muted/60',
                                    'transition-[color,background-color,border-color,box-shadow] duration-200',
                                    'hover:border-brand/30',
                                    'focus-visible:bg-surface dark:focus-visible:bg-surface focus-visible:border-brand/60 focus-visible:ring-4 focus-visible:ring-brand/15',
                                    'aria-invalid:border-rose-500/70 aria-invalid:ring-rose-500/15 dark:aria-invalid:border-rose-500/60',
                                    icon ? 'pl-10' : '',
                                    accionDerecha ? 'pr-10' : '',
                                    uppercase ? 'uppercase tracking-wide' : ''
                                ].join(' ')}
                            />
                            {accionDerecha && (
                                <span className="absolute inset-y-0 right-3 flex items-center">
                                    {accionDerecha}
                                </span>
                            )}
                        </div>
                        {error && (
                            <span id={idError} role="alert" className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                                <IconoError />
                                {error.message}
                            </span>
                        )}
                    </div>
                )
            }}
        />
    )
}

function IconoError() {
    return (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
        </svg>
    )
}
