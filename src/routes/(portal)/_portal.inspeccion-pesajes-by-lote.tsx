import { Suspense, useState } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { ApproveLoteDialog } from '#/presentation/components/lotes/ApproveLoteDialog'
import { LoteCard } from '#/presentation/components/lotes/LoteCard'
import { RejectLoteDialog } from '#/presentation/components/lotes/RejectLoteDialog'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { PesajesInspectionView } from '#/presentation/views/inspeccion-pesajes/PesajesInspectionView'
import { Can } from '#/presentation/components/shared/Can'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { PERMISSIONS } from '#/presentation/types/auth/permissions'
import { CheckCircle, Trash } from 'lucide-react'

export const Route = createFileRoute(
    '/(portal)/_portal/inspeccion-pesajes-by-lote',
)({
    validateSearch: (search: Record<string, unknown>) => ({
        loteId: Number(search.loteId),
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.loteId)) {
            throw redirect({ to: '/inspeccion-clientes' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { loteId } = Route.useSearch()
    const lote = useLocation({ select: (location) => location.state.lote })
    const [rechazoAbierto, setRechazoAbierto] = useState(false)
    const [approveOpen, setApproveOpen] = useState(false)

    return (
        <div className="space-y-8">
            <ClientesHeader
                backTo="/inspeccion-clientes"
                titulo="Pesajes registrados"
                descripcion={`Todos los pesajes del lote ${lote?.nombre_lote}.`}
                actions={
                    lote && (
                        <div className="flex gap-3">
                            <Can permission={PERMISSIONS.APROBARLOTE}>
                                <CustomButton
                                    fullWidth={false}
                                    variant='success'
                                    icon={<CheckCircle className="size-4" />}
                                    onClick={() => setApproveOpen(true)}
                                >
                                    Aprobar lote
                                </CustomButton>
                            </Can>
                            <Can permission={PERMISSIONS.RECHAZARLOTE}>
                                <CustomButton
                                    fullWidth={false}
                                    variant='danger'
                                    icon={<Trash className="size-4" />}
                                    onClick={() => setRechazoAbierto(true)}
                                >
                                    Rechazar lote
                                </CustomButton>
                            </Can>
                        </div>
                    )
                }
            />

            {lote && (
                <>
                    <ApproveLoteDialog
                        lote={lote}
                        open={approveOpen}
                        onOpenChange={setApproveOpen}
                    />

                    <RejectLoteDialog
                        lote={lote}
                        open={rechazoAbierto}
                        onOpenChange={setRechazoAbierto}
                    />
                </>
            )}

            {lote && (
                <div className="max-w-md">
                    <LoteCard lote={lote} />
                </div>
            )}

            <Suspense fallback={<LoadingState label="Cargando pesajes..." />}>
                <PesajesInspectionView loteId={loteId} />
            </Suspense>
        </div>
    )
}
