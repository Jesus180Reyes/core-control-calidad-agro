import { Scale } from "lucide-react"

import { EstadoAprobado, EstadoDesviado, EstadoEspera } from "#/presentation/components/control-calidad/BasculaStates"
import { CustomButton } from "#/presentation/components/shared/button/CustomButton"

interface MonitoreoBasculaCardProps {
    pesoActual: number
    requiereReajuste: boolean
    diferencia: number
    isStabilizing: boolean
    /** `unidad_medida` del lote; llega del API en mayúsculas ("LIBRAS"). */
    unidad: string
    /** Hay un `POST /pesajes` en vuelo. */
    guardando: boolean
    onGuardar?: () => void
}

export function MonitoreoBasculaCard({
    pesoActual,
    requiereReajuste,
    diferencia,
    isStabilizing,
    unidad,
    guardando,
    onGuardar,
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
                disabledGuardar={esPesoCero || requiereReajuste || isStabilizing || guardando}
                guardando={guardando}
                hint={guardando ? null : saveHint({ esPesoCero, requiereReajuste, isStabilizing, diferencia })}
                onGuardar={onGuardar}
            />

        </div>
    )
}

interface SaveHint {
    text: string
    tone: 'muted' | 'warning' | 'success'
}

/**
 * Por qué el botón está apagado, o que ya se puede registrar. El orden es el
 * de la prioridad: sin carga no hay nada que medir, y fuera de rango no
 * importa si el peso todavía se mueve.
 */
function saveHint({ esPesoCero, requiereReajuste, isStabilizing, diferencia }: {
    esPesoCero: boolean
    requiereReajuste: boolean
    isStabilizing: boolean
    diferencia: number
}): SaveHint {
    if (esPesoCero) return { text: 'Colocá el producto sobre la báscula para empezar.', tone: 'muted' }

    // Fuera de rango, el signo respecto del ideal dice de qué lado se salió.
    if (requiereReajuste) {
        return diferencia < 0
            ? { text: 'Falta producto: el peso está por debajo del mínimo del lote.', tone: 'warning' }
            : { text: 'Sobra producto: el peso está por encima del máximo del lote.', tone: 'warning' }
    }

    if (isStabilizing) return { text: 'Esperando que el peso se estabilice…', tone: 'muted' }

    return { text: 'Peso estable y dentro de rango: listo para registrar.', tone: 'success' }
}

const HINT_TONES: Record<SaveHint['tone'], string> = {
    muted: 'text-slate-500 dark:text-zinc-400',
    warning: 'text-amber-600 dark:text-amber-500',
    success: 'text-emerald-600 dark:text-emerald-500',
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
    guardando: boolean
    hint: SaveHint | null
    onGuardar?: () => void
}

function PanelAcciones({ disabledGuardar, guardando, hint, onGuardar }: PanelAccionesProps) {
    return (
        <div className="w-full space-y-4 pt-6 lg:pt-8 border-t border-slate-50 dark:border-zinc-800/40">

            <CustomButton
                variant="primary"
                onClick={onGuardar}
                disabled={disabledGuardar}
                isLoading={guardando}
                icon={<Scale className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />}
            >
                Registrar pesaje
            </CustomButton>

            {/* El alto fijo evita que el botón salte cuando el aviso desaparece al guardar. */}
            <p aria-live="polite" className={`min-h-5 text-center text-sm font-medium ${hint ? HINT_TONES[hint.tone] : ''}`}>
                {hint?.text}
            </p>

        </div >
    )
}