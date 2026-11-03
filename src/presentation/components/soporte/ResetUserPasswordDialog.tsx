import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { GeneratedSecret } from '#/presentation/components/soporte/GeneratedSecret'
import { useResetUserPassword } from '#/presentation/hooks/soporte/useResetUserPassword'
import type { CatalogUser } from '#/presentation/types/catalogos/catalogo_response'

interface ResetUserPasswordDialogProps {
    user: CatalogUser
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Confirma y restablece la contraseña de un usuario. Dos pasos en el mismo
 * diálogo: la confirmación, y después la contraseña temporal que generó el
 * backend, que se ve una sola vez. Cerrar hace `reset()` y la contraseña sale
 * de la memoria.
 */
export function ResetUserPasswordDialog({ user, open, onOpenChange }: ResetUserPasswordDialogProps) {
    const { mutate: resetPassword, data, isPending, reset } = useResetUserPassword({ userId: user.id })

    const handleOpenChange = (next: boolean) => {
        // Con el pedido en curso no se cierra: la contraseña ya cambió en el
        // backend y, si el diálogo se cerrara, la temporal se perdería.
        if (isPending) return
        if (!next) reset()
        onOpenChange(next)
    }

    return (
        <CustomDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={data ? 'Contraseña restablecida' : 'Restablecer contraseña'}
            description={
                data
                    ? `Entréguele esta contraseña temporal a ${user.nombre}.`
                    : `Se va a generar una contraseña temporal para ${user.nombre}. La contraseña actual deja de funcionar en ese momento.`
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
                            variant="danger"
                            fullWidth={false}
                            onClick={() => resetPassword()}
                            disabled={isPending}
                            isLoading={isPending}
                        >
                            {isPending ? 'Restableciendo...' : 'Restablecer contraseña'}
                        </CustomButton>
                    </>
                )
            }
        >
            {data ? (
                <GeneratedSecret
                    label="Contraseña temporal"
                    value={data.password_temporal}
                    hint="Al ingresar con ella, el sistema le va a pedir que la cambie por una propia."
                />
            ) : (
                <p className="text-sm text-text-muted">
                    No puede restablecer su propia contraseña desde acá.
                </p>
            )}
        </CustomDialog>
    )
}
