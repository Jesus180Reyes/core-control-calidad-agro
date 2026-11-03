import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { ResetUserPasswordResponse } from '#/presentation/types/soporte/soporte.types'

/**
 * `PATCH /auth/usuarios/:id/reset-password`, sin body: la contraseña temporal
 * la genera el backend. Exige rol `ADMIN` (403) y responde 400 si un admin se
 * apunta a sí mismo; los dos salen por el toast automático. No hay forma de
 * esconder la acción en la fila propia: la sesión no guarda el id del usuario.
 *
 * La contraseña queda en el `data` de la mutación, en memoria: `reset()` la borra.
 */
export function useResetUserPassword({ userId }: { userId: number }) {
    return useExecuteMutation<ResetUserPasswordResponse>(`/auth/usuarios/${userId}/reset-password`, {
        method: 'PATCH',
        onSuccess: (data) => toast.success(data.msg),
    })
}
