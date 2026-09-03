import { AlertaDesconexionBascula, BannerEstadoBascula } from '#/presentation/components/control-calidad/AlertaDesconexionBascula'
import { BannerEstabilizacion } from '#/presentation/components/control-calidad/BannerEstabilizacion'
import { BloqueoCriticoDialog } from '#/presentation/components/control-calidad/BloqueoCriticoDialog'
import { HeaderControlCalidad } from '#/presentation/components/control-calidad/HeaderControlCalidad'
import { SelectorBasculaDialog } from '#/presentation/components/control-calidad/SelectorBasculaDialog'
import { useControlCalidad } from '#/presentation/hooks/bascula/useControlCalidad'
import { DetallesOperacionCard } from '#/presentation/views/control-calidad/DetallesOperacionCard'
import { MonitoreoBasculaCard } from '#/presentation/views/control-calidad/MonitoreoBasculaCard'
import { ParametrosReferenciaCard } from '#/presentation/views/control-calidad/ParametrosReferenciaCard'
import { createFileRoute, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/(portal)/_portal/control-calidad')({
    // Sin cliente no se pesa y sin lote no hay rango: la entrada directa por
    // URL rebota al paso que falte.
    beforeLoad: ({ location }) => {
        if (!location.state.cliente) {
            throw redirect({ to: '/clientes' })
        }
        if (!location.state.lote) {
            throw redirect({ to: '/lotes-clientes', state: { cliente: location.state.cliente } })
        }
    },
    component: ControlCalidadPage,
})

function ControlCalidadPage() {
    const navigate = useNavigate()
    const cliente = useLocation({ select: (location) => location.state.cliente }) ?? null
    const lote = useLocation({ select: (location) => location.state.lote }) ?? null
    const pathname = useLocation({ select: (location) => location.pathname })

    // Respaldo del lado del cliente, por el mismo motivo documentado en
    // `_portal.tsx`: cuando el HTML llega ya renderizado por el SSR, TanStack
    // Start no repite `router.load()` al hidratar y el `beforeLoad` de arriba
    // no vuelve a correr.
    useEffect(() => {
        // El router publica la ubicación destino apenas arranca la navegación,
        // con esta pantalla todavía montada. Sin el chequeo de `pathname`, salir
        // hacia una ruta sin `state.cliente` (el Sidebar, por ejemplo) haría que
        // este respaldo se disparara y reemplazara ese destino por `/clientes`.
        if (pathname !== Route.fullPath) return

        if (!cliente) {
            navigate({ to: '/clientes', replace: true })
            return
        }
        if (!lote) {
            navigate({ to: '/lotes-clientes', state: { cliente }, replace: true })
        }
    }, [cliente, lote, pathname, navigate])

    const {
        operacion,
        parametros,
        scale,
        selector,
        pesajeInfo,
        bloqueo,
        guardarPesaje,
        guardando,

    } = useControlCalidad(cliente, lote)

    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 p-6 space-y-6 overflow-y-auto">

            <HeaderControlCalidad
                estado={scale.estado}
                error={scale.error}
                intentoReconexion={scale.intentoReconexion}
                maxIntentos={scale.maxIntentosReconexion}
                onConnect={() => selector.abrir()}
                onDisconnect={() => void scale.disconnectSerial()}
                onReintentar={() => void scale.reconectar()}
                onVolver={() => navigate({ to: '/lotes-clientes', state: { cliente: cliente ?? undefined } })}
            />

            <BannerEstadoBascula
                estado={scale.estado}
                isSupported={scale.isSupported}
                senalRestablecida={scale.senalRestablecida}
                intentoReconexion={scale.intentoReconexion}
                maxIntentos={scale.maxIntentosReconexion}
                onReintentar={() => void scale.reconectar()}
            />

            {scale.isStabilizing && (
                <BannerEstabilizacion tiempo={scale.tiempoRestante} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <DetallesOperacionCard operacion={operacion} />
                    <ParametrosReferenciaCard parametros={parametros} pesoActual={scale.pesoActual} />
                </div>

                <div className="lg:col-span-7">
                    <MonitoreoBasculaCard
                        pesoActual={scale.pesoActual}
                        requiereReajuste={pesajeInfo.requiereReajuste}
                        diferencia={pesajeInfo.diferencia}
                        isStabilizing={scale.isStabilizing}
                        unidad={parametros.unidad}
                        guardando={guardando}
                        onGuardar={() => void guardarPesaje()}
                        onImprimirEtiqueta={() => console.log('Vamos a imprimir')}
                    />
                </div>
            </div>

            <BloqueoCriticoDialog
                isOpen={bloqueo.mostrar}
                onAutorizar={bloqueo.handleAutorizar}
                onRechazar={bloqueo.handleRechazar}
            />

            <SelectorBasculaDialog
                abierto={selector.abierto}
                basculas={selector.basculas}
                cargando={selector.cargando}
                pendienteDeAlias={selector.pendienteDeAlias}
                onCerrar={selector.cerrar}
                onSeleccionar={(clave) => void selector.seleccionar(clave)}
                onAutorizarNueva={selector.autorizarNueva}
                onConfirmarAlias={(alias) => void selector.confirmarAlias(alias)}
            />

            <AlertaDesconexionBascula
                desconexion={scale.desconexion}
                estado={scale.estado}
                intentoReconexion={scale.intentoReconexion}
                maxIntentos={scale.maxIntentosReconexion}
                onReintentar={() => void scale.reconectar()}
                onCerrar={scale.descartarAviso}
            />
        </div>
    )
}





