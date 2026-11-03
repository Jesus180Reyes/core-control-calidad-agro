import { Suspense } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'

import { Button } from '#/components/ui/button'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { SupportUsersTable } from './SupportUsersTable'

/**
 * Pantalla de soporte: el lugar del personal de soporte para gestionar los
 * usuarios del sistema, entre otras tareas.
 *
 * El `<Suspense>` y el `ErrorBoundary` envuelven sólo la tabla, para que el
 * encabezado quede puesto mientras carga o si falla.
 */
export function SupportView() {
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Soporte"
                descripcion="Usuarios activos del sistema."
            />

            <ErrorBoundary
                fallback={(error, reset) => (
                    <div className="space-y-4 rounded-[28px] border border-dashed border-border-ui p-12 text-center">
                        <p className="font-bold text-text-main">No se pudieron cargar los usuarios</p>
                        <p className="text-sm text-text-muted">{error.message}</p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                limpiarErrorDeQuery()
                                reset()
                            }}
                        >
                            Reintentar
                        </Button>
                    </div>
                )}
            >
                <Suspense fallback={<LoadingState />}>
                    <SupportUsersTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    )
}
