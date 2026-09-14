import { Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { DocumentoFiscalLotesTable } from '#/presentation/views/documentos-fiscales/DocumentoFiscalLotesTable'

export const Route = createFileRoute(
    '/(portal)/_portal/ver-detalles-documento-fiscal',
)({
    validateSearch: (search: Record<string, unknown>) => ({
        documentoId: Number(search.documentoId),
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.documentoId)) {
            throw redirect({ to: '/administracion-documentos-fiscales' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { documentoId } = Route.useSearch()

    return (
        <div className="space-y-8">
            <ClientesHeader
                backTo="/administracion-documentos-fiscales"
                titulo="Detalle del documento fiscal"
                descripcion="Los lotes facturados en el documento, con lo declarado y el peso que respalda cada uno."
            />

            <Suspense fallback={<LoadingState label="Cargando lotes..." />}>
                <DocumentoFiscalLotesTable documentoId={documentoId} />
            </Suspense>
        </div>
    )
}
