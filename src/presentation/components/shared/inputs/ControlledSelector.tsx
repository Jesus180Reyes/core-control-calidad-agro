import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface SelectOption {
    value: string
    label: string
}

interface ControlledSelectorProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    label?: string
    placeholder?: string
    options: SelectOption[]
    className?: string
}

export function ControlledSelector<TFieldValues extends FieldValues>({
    name,
    control,
    label,
    placeholder = 'Seleccionar...',
    options,
    className = ''
}: ControlledSelectorProps<TFieldValues>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <div className={`space-y-2 w-full ${className}`}>
                    {label && (
                        <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                            {label}
                        </Label>
                    )}
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={`w-full bg-slate-50 border-slate-200/60 rounded-2xl px-4 py-6 text-sm font-medium text-slate-600 focus:ring-indigo-500 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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