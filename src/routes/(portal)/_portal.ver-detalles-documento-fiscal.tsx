import { Suspense } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { MousePointerClick } from 'lucide-react'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import {
    isDocumentoFiscalSection,
    type DocumentoFiscalSection,
} from '#/presentation/types/documentos-fiscales/documento-fiscal-section'
import { DocumentoFiscalImpuestosTable } from '#/presentation/views/documentos-fiscales/DocumentoFiscalImpuestosTable'
import { DocumentoFiscalLotesTable } from '#/presentation/views/documentos-fiscales/DocumentoFiscalLotesTable'
import { DocumentoFiscalSectionCards } from '#/presentation/views/documentos-fiscales/DocumentoFiscalSectionCards'

export const Route = createFileRoute(
    '/(portal)/_portal/ver-detalles-documento-fiscal',
)({
    validateSearch: (
        search: Record<string, unknown>,
    ): { documentoId: number; seccion?: DocumentoFiscalSection } => ({
        documentoId: Number(search.documentoId),
        seccion: isDocumentoFiscalSection(search.seccion)
            ? search.seccion
            : undefined,
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.documentoId)) {
            throw redirect({ to: '/administracion-documentos-fiscales' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { documentoId, seccion } = Route.useSearch()

    return (
        <div className="space-y-8">
            <ClientesHeader
                backTo="/administracion-documentos-fiscales"
                titulo="Detalle del documento fiscal"
                descripcion="Los impuestos aplicados y los lotes facturados en el documento."
            />

            <Suspense fallback={<LoadingState label="Cargando documento..." />}>
                <div className="space-y-6">
                    <DocumentoFiscalSectionCards
                        documentoId={documentoId}
                        selected={seccion}
                    />

                    {seccion === 'impuestos' && (
                        <DocumentoFiscalImpuestosTable documentoId={documentoId} />
                    )}

                    {seccion === 'lotes' && (
                        <DocumentoFiscalLotesTable documentoId={documentoId} />
                    )}

                    {!seccion && (
                        <EmptyState
                            icon={<MousePointerClick className="size-7" />}
                            title="Seleccione qué desea visualizar"
                            description="Elija impuestos o lotes en las tarjetas de arriba para ver el detalle."
                        />
                    )}
                </div>
            </Suspense>
        </div>
    )
}
