import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { AutorizacionSupervisor, ValidarPinBody, ValidarPinResponse } from '#/presentation/types/pesajes/pesajes.types'

/**
 * Valida el PIN de un supervisor (SPEC 38 del backend) y devuelve la
 * autorización de un solo uso que después viaja en `POST /pesajes`.
 */
export function useValidateSupervisorPin() {
    const mutation = useExecuteMutation<ValidarPinResponse, ValidarPinBody>('/pesajes/validar-pin', {
        // Con `onError` propio no sale el toast automático: el error lo pinta
        // el `BloqueoCriticoDialog` en línea, igual que el login.
        onError: () => {},
    })

    /** Rechaza con el error tal cual: quien llama distingue el 400 del resto. */
    const validarPin = (pin: string): Promise<AutorizacionSupervisor> =>
        mutation.mutateAsync({ pin }).then(({ autorizacion }) => autorizacion)

    return { validarPin, validando: mutation.isPending }
}
