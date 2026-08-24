import { EstadoAprobado, EstadoDesviado, EstadoEspera } from "#/presentation/components/control-calidad/BasculaStates"
import { CustomButton } from "#/presentation/components/shared/button/CustomButton"

interface MonitoreoBasculaCardProps {
    pesoActual: number
    requiereReajuste: boolean
    diferencia: number
    isStabilizing: boolean
    /** `unidad_medida` del lote; llega del API en mayúsculas ("LIBRAS"). */
    unidad: string
    onGuardar?: () => void
    onImprimirEtiqueta?: () => void
}

export function MonitoreoBasculaCard({
    pesoActual,
    requiereReajuste,
    diferencia,
    isStabilizing,
    unidad,
    onGuardar,
    onImprimirEtiqueta,
}: MonitoreoBasculaCardProps) {

    const esPesoCero = pesoActual === 0

    return (
        <div className="relative w-full min-w-95 md:min-w-120 max-w-xl lg:max-w-2xl mx-auto h-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-[3rem] p-10 lg:p-14 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col justify-between transition-all space-y-8 lg:space-y-12">

            <div className="grow w-full">
                <ContenidoEstado
                    esPesoCero={esPesoCero}
                    requiereReajuste={requiereReajuste}
                    pesoActual={pesoActual}
                    diferencia={diferencia}
                    isStabilizing={isStabilizing}
                    unidad={unidad}
                />
            </div>

            <PanelAcciones
                disabledGuardar={esPesoCero || requiereReajuste || isStabilizing}
                onGuardar={onGuardar}
                onImprimirEtiqueta={onImprimirEtiqueta}
                isStabilizing={isStabilizing}
                pesoActual={pesoActual}
                requiereReajuste={requiereReajuste}
            />

        </div>
    )
}

interface ContenidoEstadoProps {
    esPesoCero: boolean
    requiereReajuste: boolean
    pesoActual: number
    diferencia: number
    isStabilizing: boolean
    unidad: string
}

function ContenidoEstado({ esPesoCero, requiereReajuste, pesoActual, diferencia, isStabilizing, unidad }: ContenidoEstadoProps) {
    if (esPesoCero) return <EstadoEspera unidad={unidad} />

    if (requiereReajuste) {
        return (
            <EstadoDesviado
                pesoActual={pesoActual}
                diferencia={diferencia}
                isStabilizing={isStabilizing}
                unidad={unidad}
            />
        )
    }

    return (
        <EstadoAprobado
            pesoActual={pesoActual}
            diferencia={diferencia}
            isStabilizing={isStabilizing}
            unidad={unidad}
        />
    )
}

interface PanelAccionesProps {
    disabledGuardar: boolean
    onGuardar?: () => void
    onImprimirEtiqueta?: () => void
    isStabilizing: boolean
    pesoActual: number
    requiereReajuste: boolean

}

function PanelAcciones({ disabledGuardar, onGuardar, onImprimirEtiqueta, isStabilizing, pesoActual, requiereReajuste }: PanelAccionesProps) {
    return (
        <div className="w-full space-y-4 pt-6 lg:pt-8 border-t border-slate-50 dark:border-zinc-800/40">

            <CustomButton
                variant="primary"
                onClick={onGuardar}
                disabled={disabledGuardar}
                isLoading={isStabilizing}
                icon={
                    <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                }
            >
                Guardar en Base de Datos
            </CustomButton>
            {(!isStabilizing && pesoActual > 0 && !requiereReajuste) && (


                < CustomButton
                    variant="secondary"
                    onClick={onImprimirEtiqueta}
                    icon={
                        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l-.24-2.48a1.125 1.125 0 011.12-1.24h8.8a1.125 1.125 0 011.12 1.24l-.24 2.48m-10.56 0h10.56m-10.56 0a1.125 1.125 0 00-1.12 1.24v2.88c0 .53.43.96.96.96h10.88c.53 0 .96-.43.96-.96v-2.88a1.125 1.125 0 00-1.12-1.24M15 18H9M15 6h-6V4h6v2z" />
                        </svg>
                    }
                >
                    Imprimir Etiqueta
                </CustomButton>

            )
            }

        </div >
    )
}