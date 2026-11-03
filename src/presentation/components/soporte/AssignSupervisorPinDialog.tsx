import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { GeneratedSecret } from '#/presentation/components/soporte/GeneratedSecret'
import { useAssignSupervisorPin } from '#/presentation/hooks/soporte/useAssignSupervisorPin'
import type { CatalogUser } from '#/presentation/types/catalogos/catalogo_response'

interface AssignSupervisorPinDialogProps {
    user: CatalogUser
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Confirma y asigna el PIN de un supervisor. Dos pasos en el mismo diálogo:
 * la confirmación, y después el PIN que generó el backend, que se ve una sola
 * vez. Cerrar hace `reset()` y el PIN sale de la memoria.
 */
export function AssignSupervisorPinDialog({ user, open, onOpenChange }: AssignSupervisorPinDialogProps) {
    const { mutate: assignPin, data, isPending, reset } = useAssignSupervisorPin({ userId: user.id })

    const handleOpenChange = (next: boolean) => {
        // Con el pedido en curso no se cierra: el PIN llegaría a un diálogo cerrado y se perdería.
        if (isPending) return
        if (!next) reset()
        onOpenChange(next)
    }

    return (
        <CustomDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={data ? 'PIN asignado' : 'Asignar PIN de supervisor'}
            description={
                data
                    ? `Entréguele este PIN a ${user.nombre}.`
                    : `Se va a generar el PIN de ${user.nombre}. El sistema lo elige y se asigna una sola vez: después no se puede cambiar desde esta pantalla.`
            }
            showCloseButton={!isPending}
            size="md"
            footer={
                data ? (
                    <CustomButton fullWidth={false} onClick={() => handleOpenChange(false)}>
                        Listo
                    </CustomButton>
                ) : (
                    <>
                        <CustomButton
                            variant="secondary"
                            fullWidth={false}
                            onClick={() => handleOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </CustomButton>
                        <CustomButton
                            fullWidth={false}
                            onClick={() => assignPin()}
                            disabled={isPending}
                            isLoading={isPending}
                        >
                            {isPending ? 'Generando...' : 'Generar PIN'}
                        </CustomButton>
                    </>
                )
            }
        >
            {data ? (
                <GeneratedSecret
                    label="PIN"
                    value={data.pin}
                    hint="Con este PIN el supervisor autoriza los pesos fuera de rango en la báscula."
                />
            ) : (
                <p className="text-sm text-text-muted">
                    Sólo los usuarios con rol supervisor pueden tener PIN, y cada uno tiene uno solo.
                </p>
            )}
        </CustomDialog>
    )
}
