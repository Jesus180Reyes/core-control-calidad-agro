import { createFileRoute } from '@tanstack/react-router'

import { requirePermission } from '#/presentation/hooks/auth/requirePermission'
import { PERMISSIONS } from '#/presentation/types/auth/permissions'
import { SupportView } from '#/presentation/views/soporte/SupportView'

export const Route = createFileRoute('/(portal)/_portal/soporte')({
    beforeLoad: () => requirePermission(PERMISSIONS.MODULOSOPORTE),
    component: SupportView,
})
