import { Check, Printer } from 'lucide-react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import type { PesajeCreado } from '#/presentation/types/pesajes/pesajes.types'

interface PrintTicketDialogProps {
    /** El pesaje que espera su ticket; `null` mantiene el modal cerrado. */
    pesaje: PesajeCreado | null
    /** Se está generando la etiqueta. */
    imprimiendo: boolean
    /** El diálogo del navegador ya se abrió: falta que el operario confirme. */
    iniciada: boolean
    /** Ya falló al menos un intento de impresión. */
    fallo: boolean
    /** Se puede salir sin imprimir: la impresión ya falló dos veces. */
    puedeOmitir: boolean
    onImprimir: () => void
    onConfirmar: () => void
    onOmitir: () => void
}

/**
 * El paso que cierra el pesaje: el bulto no sale de la plataforma sin su
 * etiqueta. Por eso el modal es bloqueante —sin X, sin Esc y sin click afuera—
 * y su única acción es imprimir, que abre el diálogo del navegador para que el
 * operario elija la impresora.
 *
 * Quien cierra el modal es el operario, con "Ya lo imprimí". No es una
 * concesión: el navegador no avisa si el papel salió, si canceló o si guardó el
 * archivo, y atarse a una señal que no existe deja el modal colgado.
 *
 * La salida de emergencia aparece recién tras dos intentos fallidos: si el
 * servicio de reportes se cae, un modal sin salida frena la planta entera.
 */
export function PrintTicketDialog({
    pesaje,
    imprimiendo,
    iniciada,
    fallo,
    puedeOmitir,
    onImprimir,
    onConfirmar,
    onOmitir,
}: PrintTicketDialogProps) {
    const etiquetaDeImpresion = imprimiendo
        ? 'Abriendo impresión…'
        : iniciada
            ? 'Volver a imprimir'
            : fallo
                ? 'Reintentar impresión'
                : 'Imprimir ticket'

    return (
        <CustomDialog
            open={pesaje !== null}
            // Vacío a propósito: el ticket no se cierra con Esc ni con un click afuera.
            onOpenChange={() => { }}
            title="Pesaje registrado exitosamente"
            size="sm"
            showCloseButton={false}
            footer={
                <>
                    {puedeOmitir && !iniciada && (
                        <CustomButton
                            variant="secondary"
                            fullWidth={false}
                            type="button"
                            disabled={imprimiendo}
                            onClick={onOmitir}
                        >
                            Continuar sin imprimir
                        </CustomButton>
                    )}
                    <CustomButton
                        variant={iniciada ? 'secondary' : 'primary'}
                        fullWidth={false}
                        type="button"
                        isLoading={imprimiendo}
                        icon={<Printer className="h-5 w-5" />}
                        onClick={onImprimir}
                    >
                        {etiquetaDeImpresion}
                    </CustomButton>
                    {iniciada && (
                        <CustomButton
                            variant="primary"
                            fullWidth={false}
                            type="button"
                            disabled={imprimiendo}
                            icon={<Check className="h-5 w-5" />}
                            onClick={onConfirmar}
                        >
                            Ya lo imprimí
                        </CustomButton>
                    )}
                </>
            }
        >
            {iniciada ? (
                <p className="text-sm text-text-muted">
                    Confirmá que el ticket salió de la impresora para seguir con el próximo bulto.
                </p>
            ) : fallo ? (
                <p className="text-sm font-semibold text-warning">
                    No se pudo abrir la impresión de la etiqueta. Reintentá.
                </p>
            ) : null}
        </CustomDialog>
    )
}
