import { Suspense, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import type { FiltrosDocumentosFiscales } from '#/presentation/schema/documentos-fiscales/filtrosDocumentosFiscalesSchema'
import { DocumentosFiscalesFiltersBar } from '#/presentation/views/documentos-fiscales/DocumentosFiscalesFiltersBar'
import { DocumentosFiscalesView } from '#/presentation/views/documentos-fiscales/DocumentosFiscalesView'

export const Route = createFileRoute(
    '/(portal)/_portal/administracion-documentos-fiscales',
)({
    component: RouteComponent,
})

function RouteComponent() {
    const [filtros, setFiltros] = useState<FiltrosDocumentosFiscales>({})

    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Documentos fiscales"
                descripcion="Todos los documentos emitidos, con su autorización, moneda e importes."
                actions={
                    <CustomButton
                        fullWidth={false}
                        icon={<Plus className="size-4" />}
                    >
                        Crear Documento Fiscal
                    </CustomButton>
                }
            />

            <Suspense fallback={<LoadingState label="Cargando filtros..." />}>
                <DocumentosFiscalesFiltersBar
                    filtros={filtros}
                    onApply={setFiltros}
                />
            </Suspense>

            <Suspense
                fallback={<LoadingState label="Cargando documentos fiscales..." />}
            >
                <DocumentosFiscalesView filtros={filtros} />
            </Suspense>
        </div>
    )
}
