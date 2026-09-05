import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { createTaraSchema, type TaraSchema } from '#/presentation/schema/crear-pesaje/taraSchema'

const ID_FORMULARIO = 'form-tara-pesaje'

interface TaraPesajeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /**
     * Peso ya confirmado por la báscula; es el `peso_bruto` que se va a enviar.
     * `null` mientras la muestra se reestabiliza: no hay nada que guardar.
     */
    pesoBruto: number | null
    /** Segundos que faltan para que cierre la ventana de estabilización. */
    tiempoRestante: number
    /** `unidad_medida` del lote; llega del API en mayúsculas ("LIBRAS"). */
    unidad: string
    /** Hay un `POST /pesajes` en vuelo. */
    guardando: boolean
    onConfirm: (tara: number) => void
}

/**
 * Último paso antes de guardar: el operario declara la tara del envase para que
 * el backend pueda calcular el peso neto. El peso bruto ya no se toca acá —es la
 * muestra estabilizada— y se muestra sólo como referencia.
 *
 * Si el peso cambia con el dialog abierto, la báscula invalida la muestra y
 * vuelve a estabilizar: acá eso se ve como el aviso y el botón deshabilitado,
 * hasta que llegue el peso nuevo.
 */
export function TaraPesajeDialog({
    open,
    onOpenChange,
    pesoBruto,
    tiempoRestante,
    unidad,
    guardando,
    onConfirm,
}: TaraPesajeDialogProps) {
    const reestabilizando = pesoBruto === null

    const schema = useMemo(() => createTaraSchema(pesoBruto ?? 0), [pesoBruto])

    const form = useForm<TaraSchema>({
        resolver: zodResolver(schema),
    })

    // Cada pesaje declara su propia tara: al reabrir, el campo arranca vacío.
    useEffect(() => {
        if (!open) return
        form.reset({ tara: undefined })
    }, [open])

    // Con un peso bruto nuevo, una tara ya escrita puede haber dejado de ser
    // válida (o de ser inválida): se revalida contra el peso nuevo.
    useEffect(() => {
        if (!open || pesoBruto === null) return
        if (form.getValues('tara') === undefined) return
        void form.trigger('tara')
    }, [open, pesoBruto])

    const onSubmit: SubmitHandler<TaraSchema> = ({ tara }) => {
        if (pesoBruto === null) return
        onConfirm(tara)
    }

    const tara = form.watch('tara')
    const pesoNeto = pesoBruto === null ? null : pesoBruto - (tara ?? 0)

    return (
        <CustomDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Tara del envase"
            description="Ingresá la tara para registrar el pesaje. El peso neto se calcula con el peso bruto ya confirmado por la báscula."
            size="sm"
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        fullWidth={false}
                        type="button"
                        disabled={guardando}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        variant="primary"
                        fullWidth={false}
                        form={ID_FORMULARIO}
                        type="submit"
                        isLoading={guardando}
                        disabled={reestabilizando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar pesaje'}
                    </CustomButton>
                </>
            }
        >
            <form
                id={ID_FORMULARIO}
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <ControlledInput
                    control={form.control}
                    name="tara"
                    label={`Tara (${unidad})`}
                    placeholder="0.00"
                    type="number"
                    valueAsNumber
                    disabled={guardando}
                />

                <dl className="space-y-1 rounded-2xl border border-border-ui bg-bg-app px-4 py-3 text-sm">
                    {reestabilizando && (
                        <p className="pb-2 text-xs font-semibold text-warning">
                            El peso cambió — reestabilizando… {tiempoRestante} s
                        </p>
                    )}
                    <div className="flex items-center justify-between">
                        <dt className="text-text-muted">Peso bruto</dt>
                        <dd className="font-bold text-text-main">
                            {pesoBruto === null ? '—' : `${pesoBruto.toFixed(2)} ${unidad}`}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-text-muted">Peso neto</dt>
                        <dd className="font-black text-text-main">
                            {pesoNeto === null ? '—' : `${pesoNeto.toFixed(2)} ${unidad}`}
                        </dd>
                    </div>
                </dl>
            </form>
        </CustomDialog>
    )
}
