import { Suspense } from 'react'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { esDeRed, esHttpError, mensajeDelServidor } from '#/infrastructure/http/http-client'
import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import { ErrorBoundary } from '#/presentation/components/shared/ErrorBoundary'
import { ClientesView } from '#/presentation/views/clientes/ClientesView'

export const Route = createFileRoute('/(portal)/_portal/clientes')({
    component: ClientesPage,
})

const cargando = (
    <div className="flex justify-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-text-muted" />
    </div>
)

/** El 401 no llega acá: el interceptor de auth cierra sesión y va a `/login`. */
function mensajeDeError(error: Error): string {
    if (esDeRed(error)) return 'No se pudo contactar al servidor.'
    if (esHttpError(error)) return mensajeDelServidor(error.body) ?? `Error ${error.status} del servidor.`
    return 'Ocurrió un error inesperado.'
}

function ClientesPage() {
    // El ErrorBoundary limpia su propio estado, pero el error sigue cacheado en
    // la query: sin este reset, "Reintentar" vuelve a lanzarlo al instante.
    const { reset: limpiarErrorDeQuery } = useQueryErrorResetBoundary()

    return (
        <div className="space-y-8">
            <ClientesHeader
                paso="Paso 1 de 2"
                titulo="Seleccioná un cliente"
                descripcion="Elegí para quién vas a pesar. Después de eso se abre la báscula."
            />

            {/*
              `GET /clientes` exige el Bearer y el token vive en `localStorage`,
              que no existe en el servidor: si la query corriera en el SSR
              saldría sin `Authorization` y el 401 rompería el render. Por eso el
              listado se monta sólo en el cliente.
            */}
            <ClientOnly fallback={cargando}>
                <ErrorBoundary
                    fallback={(error, reset) => (
                        <div className="border border-dashed border-border-ui rounded-[28px] p-12 text-center space-y-4">
                            <p className="text-text-main font-bold">No se pudo cargar la lista de clientes</p>
                            <p className="text-sm text-text-muted">{mensajeDeError(error)}</p>
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
                    <Suspense fallback={cargando}>
                        <ClientesView />
                    </Suspense>
                </ErrorBoundary>
            </ClientOnly>
        </div>
    )
}
