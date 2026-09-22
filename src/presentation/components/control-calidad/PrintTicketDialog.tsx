import { Printer } from 'lucide-react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import type { PesajeCreado } from '#/presentation/types/pesajes/pesajes.types'

interface PrintTicketDialogProps {
    /** El pesaje que espera su ticket; `null` mantiene el modal cerrado. */
    pesaje: PesajeCreado | null
    /** Hay una descarga de la etiqueta en vuelo. */
    imprimiendo: boolean
    /** Ya falló al menos un intento de descarga. */
    fallo: boolean
    /** Se puede salir sin imprimir: la descarga ya falló dos veces. */
    puedeOmitir: boolean
    onImprimir: () => void
    onOmitir: () => void
}

/**
 * El paso que cierra el pesaje: el bulto no sale de la plataforma sin su
 * etiqueta. Por eso el modal es bloqueante —sin X, sin Esc y sin click afuera—
 * y su única acción es imprimir.
 *
 * La salida de emergencia aparece recién tras dos descargas fallidas: si el
 * servicio de reportes se cae, un modal sin salida frena la planta entera.
 */
export function PrintTicketDialog({
    pesaje,
    imprimiendo,
    fallo,
    puedeOmitir,
    onImprimir,
    onOmitir,
}: PrintTicketDialogProps) {
    const etiquetaDelBoton = imprimiendo
        ? 'Imprimiendo…'
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
                    {puedeOmitir && (
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
                        variant="primary"
                        fullWidth={false}
                        type="button"
                        isLoading={imprimiendo}
                        icon={<Printer className="h-5 w-5" />}
                        onClick={onImprimir}
                    >
                        {etiquetaDelBoton}
                    </CustomButton>
                </>
            }
        >
            {fallo ? (
                <p className="text-sm font-semibold text-warning">
                    No se pudo descargar la etiqueta. Reintentá la impresión.
                </p>
            ) : null}
        </CustomDialog>
    )
}
