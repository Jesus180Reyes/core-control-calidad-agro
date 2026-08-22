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
    uppercase = false
}: ControlledInputProps<TFieldValues>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <div className={`space-y-2 w-full ${className}`}>
                    {label && (
                        <Label htmlFor={name} className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                            {label}
                        </Label>
                    )}
                    <div className="relative">
                        {icon && (
                            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">
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
                            className={`w-full bg-white border-slate-200/80 shadow-sm focus-visible:ring-indigo-500 ${icon ? 'pl-9' : ''} ${accionDerecha ? 'pr-9' : ''} ${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${uppercase ? 'uppercase' : ''}`}
                        />
                        {accionDerecha && (
                            <span className="absolute inset-y-0 right-3 flex items-center">
                                {accionDerecha}
                            </span>
                        )}
                    </div>
                    {error && (
                        <span className="text-[11px] font-semibold text-red-500 block mt-1">
                            {error.message}
                        </span>
                    )}
                </div>
            )}
        />
    )
}