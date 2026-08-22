import { AlertaDesconexionBascula, BannerEstadoBascula } from '#/presentation/components/control-calidad/AlertaDesconexionBascula'
import { BannerEstabilizacion } from '#/presentation/components/control-calidad/BannerEstabilizacion'
import { BloqueoCriticoDialog } from '#/presentation/components/control-calidad/BloqueoCriticoDialog'
import { HeaderControlCalidad } from '#/presentation/components/control-calidad/HeaderControlCalidad'
import { SelectorBasculaDialog } from '#/presentation/components/control-calidad/SelectorBasculaDialog'
import { useControlCalidad } from '#/presentation/hooks/bascula/useControlCalidad'
import { AyudaVisualCard } from '#/presentation/views/control-calidad/AyudaVisualCard'
import { DetallesOperacionCard } from '#/presentation/views/control-calidad/DetallesOperacionCard'
import { HistorialMuestrasCard } from '#/presentation/views/control-calidad/HistorialMuestrasCard'
import { MonitoreoBasculaCard } from '#/presentation/views/control-calidad/MonitoreoBasculaCard'
import { ParametrosReferenciaCard } from '#/presentation/views/control-calidad/ParametrosReferenciaCard'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/control-calidad')({
    component: ControlCalidadPage,
})

function ControlCalidadPage() {
    const {
        operacion,
        parametros,
        ultimasMuestras,
        scale,
        selector,
        pesajeInfo,
        bloqueo,

        // Puente temporal: el paso 8 lo reemplaza por el cliente del `state`.
    } = useControlCalidad(null)

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
                        onGuardar={() => console.log('guardando')}
                        onImprimirEtiqueta={() => console.log('Vamos a imprimir')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <HistorialMuestrasCard muestras={ultimasMuestras} lote={operacion.lote} />
                <AyudaVisualCard />
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





