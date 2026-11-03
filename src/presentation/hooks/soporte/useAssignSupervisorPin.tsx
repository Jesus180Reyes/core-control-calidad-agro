import { toast } from 'sonner'

import { useExecuteMutation } from '#/presentation/hooks/shared/useExecuteMutation'
import type { AssignSupervisorPinResponse } from '#/presentation/types/soporte/soporte.types'

/**
 * `PATCH /auth/usuarios/:id/pin`, sin body: el PIN lo genera el backend. Exige
 * rol `ADMIN` (403) y responde 400 si el usuario no es `SUPERVISOR` o ya tiene
 * un PIN; los dos salen por el toast automático.
 *
 * El PIN queda en el `data` de la mutación, en memoria: `reset()` lo borra.
 */
export function useAssignSupervisorPin({ userId }: { userId: number }) {
    return useExecuteMutation<AssignSupervisorPinResponse>(`/auth/usuarios/${userId}/pin`, {
        method: 'PATCH',
        onSuccess: (data) => toast.success(data.msg),
    })
}
