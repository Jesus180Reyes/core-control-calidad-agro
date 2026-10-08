import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { CollaboratorsView } from '#/presentation/views/colaboradores/CollaboratorsView'

export const Route = createFileRoute('/(portal)/_portal/colaboradores')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Colaboradores"
                descripcion="Todos los usuarios creados en el sistema."
                actions={
                    // Todavía no hay endpoint de usuarios: la acción queda sin conectar.
                    <CustomButton
                        fullWidth={false}
                        icon={<UserPlus className="size-4" />}
                        onClick={() => console.log('Crear usuario')}
                    >
                        Crear usuario
                    </CustomButton>
                }
            />

            <Suspense fallback={<LoadingState />}>
                <CollaboratorsView />
            </Suspense>
        </div>
    )
}
