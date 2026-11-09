import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { ManualScaleProfileForm } from '#/presentation/components/control-calidad/ManualScaleProfileForm'
import type { ManualProbe } from '#/presentation/hooks/bascula/useSelectorBascula'
import type {
    BasculaDisponible,
    ClaveBascula,
    SelectorStep,
} from '#/presentation/types/control-calidad/selector-bascula.types'
import type {
    ManualProfileInput,
    ScaleProfile,
} from '#/presentation/types/control-calidad/perfil-bascula.types'

interface SelectorBasculaDialogProps {
    abierto: boolean
    basculas: BasculaDisponible[]
    cargando: boolean
    /** Báscula recién autorizada que todavía no tiene alias. */
    pendienteDeAlias: BasculaDisponible | null
    onCerrar: () => void
    onSeleccionar: (clave: ClaveBascula) => void
    onAutorizarNueva: () => void
    onConfirmarAlias: (alias: string) => void
    step: SelectorStep
    detectionProgress: number
    detectedProfile: ScaleProfile | null
    detectedWeight: number | null
    probing: boolean
    manualProbe: ManualProbe | null
    onRedetect: (clave: ClaveBascula) => void
    onCancelDetection: () => void
    onUseResult: () => void
    onRetry: () => void
    onConfigureManually: () => void
    onProbe: (input: ManualProfileInput) => void
    onDiscardProbe: () => void
    onSaveManual: () => void
    onLeaveManual: () => void
}

const STEP_TEXTS: Record<Exclude<SelectorStep, 'lista' | 'alias'>, { title: string; description: string }> = {
    detectando: {
        title: 'Detectando la báscula…',
        description: 'Mantenga la báscula encendida.',
    },
    resultado: {
        title: 'Báscula reconocida',
        description: 'Compare la lectura con el display de la báscula antes de usarla.',
    },
    fallo: {
        title: 'No se pudo reconocer la báscula',
        description: 'Revise que esté encendida y conectada, y llame a soporte si sigue igual.',
    },
    manual: {
        title: 'Configurar a mano',
        description: 'Complete los datos que figuran en el manual de la báscula y pruebe la lectura antes de guardar.',
    },
}

const weightFormatter = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 3 })

/** Etiqueta principal de la fila: el alias del operario o el puerto en crudo. */
const nombreDeBascula = ({ alias, clave, usbVendorId }: BasculaDisponible) => {
    if (alias) return alias
    // Los puertos sin IDs USB usan una clave por índice: mostrarla no aporta nada.
    return usbVendorId === undefined ? 'Puerto serial sin ID USB' : `Puerto USB ${clave}`
}

/**
 * Selector de básculas autorizadas.
 *
 * Componente presentacional: todo el estado y la lógica viven en
 * `useSelectorBascula`. Cuando `pendienteDeAlias` no es `null`, el contenido
 * cambia al formulario de alias de la báscula recién autorizada.
 */
export function SelectorBasculaDialog({
    abierto,
    basculas,
    cargando,
    pendienteDeAlias,
    onCerrar,
    onSeleccionar,
    onAutorizarNueva,
    onConfirmarAlias,
    step,
    detectionProgress,
    detectedProfile,
    detectedWeight,
    probing,
    manualProbe,
    onRedetect,
    onCancelDetection,
    onUseResult,
    onRetry,
    onConfigureManually,
    onProbe,
    onDiscardProbe,
    onSaveManual,
    onLeaveManual,
}: SelectorBasculaDialogProps) {
    const [alias, setAlias] = useState<string>('')

    // Cada báscula pendiente empieza con el campo en blanco.
    useEffect(() => {
        setAlias('')
    }, [pendienteDeAlias?.clave])

    const pidiendoAlias = pendienteDeAlias !== null
    const detectionStep = step === 'lista' || step === 'alias' ? null : STEP_TEXTS[step]

    return (
        <Dialog
            open={abierto}
            onOpenChange={(open) => { if (!open) onCerrar() }}
        >
            <DialogContent className="sm:max-w-md rounded-3xl border border-border-ui bg-surface p-6 shadow-clay-card outline-none">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black text-text-main">
                        {detectionStep?.title ?? (pidiendoAlias ? 'Nombre de la báscula' : 'Seleccionar báscula')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-text-muted">
                        {detectionStep?.description ?? (pidiendoAlias
                            ? 'Póngale un nombre para reconocerla la próxima vez.'
                            : 'Elija la báscula de su línea. Solo aparecen las que ya tienen permiso en este equipo.')}
                    </DialogDescription>
                </DialogHeader>

                {step === 'detectando' && (
                    <div className="flex flex-col gap-4">
                        <div
                            role="progressbar"
                            aria-label="Progreso de la detección"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(detectionProgress * 100)}
                            className="h-2 w-full overflow-hidden rounded-full bg-bg-app shadow-clay-inset"
                        >
                            <div
                                className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                                style={{ width: `${Math.max(4, Math.round(detectionProgress * 100))}%` }}
                            />
                        </div>
                        <CustomButton variant="secondary" onClick={onCancelDetection}>
                            Cancelar
                        </CustomButton>
                    </div>
                )}

                {step === 'resultado' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border-ui bg-bg-app px-4 py-6">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                                Última lectura
                            </span>
                            <span className="font-mono text-3xl font-black tabular-nums text-text-main">
                                {detectedWeight === null ? '—' : weightFormatter.format(detectedWeight)}
                                {detectedProfile?.unit && (
                                    <small className="ml-2 text-base font-bold text-text-muted">
                                        {detectedProfile.unit}
                                    </small>
                                )}
                            </span>
                            {!detectedProfile?.unit && (
                                <span className="text-xs text-text-muted">Unidad no informada</span>
                            )}
                        </div>
                        <CustomButton onClick={onUseResult}>
                            Usar esta báscula
                        </CustomButton>
                    </div>
                )}

                {step === 'fallo' && (
                    <div className="flex flex-col gap-2">
                        <CustomButton onClick={onRetry}>
                            Reintentar
                        </CustomButton>
                        <CustomButton variant="secondary" onClick={onConfigureManually}>
                            Configurar a mano
                        </CustomButton>
                    </div>
                )}

                {step === 'manual' && (
                    <ManualScaleProfileForm
                        probing={probing}
                        probe={manualProbe}
                        onProbe={onProbe}
                        onDiscardProbe={onDiscardProbe}
                        onSave={onSaveManual}
                        onBack={onLeaveManual}
                    />
                )}

                {detectionStep ? null : pidiendoAlias ? (
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            onConfirmarAlias(alias)
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            <label
                                htmlFor="alias-bascula"
                                className="text-[11px] font-bold uppercase tracking-widest text-text-muted"
                            >
                                Alias
                            </label>
                            <input
                                id="alias-bascula"
                                autoFocus
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                placeholder="Báscula Piso 1"
                                maxLength={40}
                                className="w-full rounded-2xl border border-border-ui bg-bg-app px-4 py-3 text-sm font-semibold text-text-main outline-none transition-colors focus:border-brand"
                            />
                            <span className="text-xs text-text-muted">
                                {nombreDeBascula({ ...pendienteDeAlias, alias: null })}
                            </span>
                        </div>

                        <CustomButton type="submit" disabled={alias.trim().length === 0}>
                            Guardar
                        </CustomButton>
                    </form>
                ) : (
                    <div className="flex flex-col gap-4">
                        {cargando && (
                            <p className="py-8 text-center text-sm text-text-muted">
                                Buscando básculas…
                            </p>
                        )}

                        {!cargando && basculas.length === 0 && (
                            <p className="py-8 text-center text-sm text-text-muted">
                                Aún no hay básculas registradas
                            </p>
                        )}

                        {!cargando && basculas.length > 0 && (
                            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                                {basculas.map((bascula) => (
                                    <li key={bascula.clave} className="flex items-stretch gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onSeleccionar(bascula.clave)}
                                            className="cursor-pointer flex w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-border-ui bg-bg-app px-4 py-3 text-left transition-colors hover:border-brand"
                                        >
                                            <span className="flex flex-col">
                                                <span className="text-sm font-bold text-text-main">
                                                    {nombreDeBascula(bascula)}
                                                </span>
                                                <span className="text-xs text-text-muted">
                                                    {bascula.usbVendorId === undefined
                                                        ? 'Sin IDs USB'
                                                        : `ID USB ${bascula.clave}`}
                                                </span>
                                            </span>

                                            {bascula.esPreferida && (
                                                <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-success">
                                                    Preferida
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRedetect(bascula.clave)}
                                            className="cursor-pointer shrink-0 rounded-2xl border border-border-ui bg-bg-app px-3 text-[11px] font-bold leading-tight text-text-muted transition-colors hover:border-brand hover:text-brand"
                                        >
                                            Volver a<br />detectar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="border-t border-border-ui pt-4">
                            <CustomButton variant="secondary" onClick={onAutorizarNueva}>
                                Autorizar báscula nueva
                            </CustomButton>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
