import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import {
    manualScaleProfileSchema,
    type ManualScaleProfileFormValues,
} from '#/presentation/schema/bascula/manualScaleProfileSchema'
import { DETECTION_BAUD_RATES, DETECTION_BYTE_FORMATS } from '#/presentation/hooks/bascula/scaleDetection'
import type { ManualProbe } from '#/presentation/hooks/bascula/useSelectorBascula'
import type { ManualProfileInput } from '#/presentation/types/control-calidad/perfil-bascula.types'

interface ManualScaleProfileFormProps {
    probing: boolean
    probe: ManualProbe | null
    onProbe: (input: ManualProfileInput) => void
    onDiscardProbe: () => void
    onSave: () => void
    onBack: () => void
}

const BAUD_RATE_OPTIONS = [...DETECTION_BAUD_RATES]
    .sort((a, b) => a - b)
    .map((baudRate) => ({ value: baudRate, label: String(baudRate) }))

const BYTE_FORMAT_OPTIONS = DETECTION_BYTE_FORMATS.map((byteFormat) => ({ value: byteFormat, label: byteFormat }))

const MODE_OPTIONS = [
    { value: 'continuo', label: 'Transmite sola' },
    { value: 'consulta', label: 'Hay que pedirle el peso' },
]

const POLL_COMMAND_OPTIONS = [
    { value: 'sics', label: 'SI (Mettler SICS)' },
    { value: 'toledo-p', label: 'P (Toledo)' },
    { value: 'w', label: 'W' },
    { value: 'enq', label: 'ENQ' },
]

const FRAME_FORMAT_OPTIONS = [
    { value: 'texto', label: 'Texto' },
    { value: 'invertido', label: 'Texto invertido' },
    { value: 'toledo-continuo', label: 'Toledo continuo' },
]

const DEFAULT_VALUES: ManualScaleProfileFormValues = {
    baudRate: 9600,
    byteFormat: '8N1',
    mode: 'continuo',
    pollCommand: null,
    frameFormat: 'texto',
}

const CONTROL_CHARACTERS = new RegExp('[\\u0000-\\u001F\\u007F-\\u00FF]', 'g')

const visibleLine = (line: string) => line.replace(CONTROL_CHARACTERS, '·')

const weightFormatter = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 3 })

export function ManualScaleProfileForm({
    probing,
    probe,
    onProbe,
    onDiscardProbe,
    onSave,
    onBack,
}: ManualScaleProfileFormProps) {
    const form = useForm<ManualScaleProfileFormValues, unknown, ManualProfileInput>({
        resolver: zodResolver(manualScaleProfileSchema),
        defaultValues: DEFAULT_VALUES,
    })

    const mode = useWatch({ control: form.control, name: 'mode' })

    useEffect(() => {
        const subscription = form.watch(() => onDiscardProbe())
        return () => subscription.unsubscribe()
    }, [form, onDiscardProbe])

    const result = probe?.result ?? null
    const canSave = !probing && result !== null && result.peso !== null

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => onProbe(values))}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ControlledSelector
                    control={form.control}
                    name="baudRate"
                    label="Velocidad"
                    options={BAUD_RATE_OPTIONS}
                    valueAsNumber
                    disabled={probing}
                />
                <ControlledSelector
                    control={form.control}
                    name="byteFormat"
                    label="Formato del byte"
                    options={BYTE_FORMAT_OPTIONS}
                    disabled={probing}
                />
                <ControlledSelector
                    control={form.control}
                    name="mode"
                    label="Modo"
                    options={MODE_OPTIONS}
                    disabled={probing}
                />
                <ControlledSelector
                    control={form.control}
                    name="frameFormat"
                    label="Formato de trama"
                    options={FRAME_FORMAT_OPTIONS}
                    disabled={probing}
                />
                {mode === 'consulta' && (
                    <ControlledSelector
                        control={form.control}
                        name="pollCommand"
                        label="Comando"
                        placeholder="Elegir comando..."
                        options={POLL_COMMAND_OPTIONS}
                        disabled={probing}
                        className="sm:col-span-2"
                    />
                )}
            </div>

            {result && (
                <div className="flex flex-col gap-2 rounded-2xl border border-border-ui bg-bg-app p-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                        Lo que llegó de la báscula
                    </span>
                    {result.lines.length > 0 ? (
                        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-text-main">
                            {result.lines.map(visibleLine).join('\n')}
                        </pre>
                    ) : (
                        <p className="text-xs text-text-muted">No llegó nada de la báscula.</p>
                    )}
                    {result.peso !== null ? (
                        <p className="text-sm font-bold text-success">
                            Peso leído: {weightFormatter.format(result.peso)} {result.unidad ?? ''}
                        </p>
                    ) : (
                        <p className="text-sm font-bold text-destructive">
                            No se leyó ningún peso. Revise los datos y pruebe de nuevo.
                        </p>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-2">
                <CustomButton type="submit" variant="secondary" isLoading={probing}>
                    {probing ? 'Probando…' : 'Probar'}
                </CustomButton>
                <CustomButton type="button" disabled={!canSave} onClick={onSave}>
                    Guardar
                </CustomButton>
                <button
                    type="button"
                    onClick={onBack}
                    className="cursor-pointer py-2 text-xs font-bold text-text-muted transition-colors hover:text-text-main"
                >
                    Volver
                </button>
            </div>
        </form>
    )
}
