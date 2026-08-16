import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ControlledDatePickerProps<TFieldValues extends FieldValues> {
    name: FieldPath<TFieldValues>
    control: Control<TFieldValues>
    label?: string
    placeholder?: string
    className?: string
}

export function ControlledDatePicker<TFieldValues extends FieldValues>({
    name,
    control,
    label,
    placeholder = 'Seleccionar fecha',
    className = ''
}: ControlledDatePickerProps<TFieldValues>) {
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
                    <Popover>
                        <PopoverTrigger >
                            <button className={`w-full flex justify-between items-center bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100/70 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}>
                                <span>
                                    {field.value ? format(new Date(field.value), "PPP", { locale: es }) : placeholder}
                                </span>
                                <span className="text-slate-400 text-sm">📅</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                className="rounded-2xl border-none"
                            />
                        </PopoverContent>
                    </Popover>
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