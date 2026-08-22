import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import type {
    BasculaDisponible,
    ClaveBascula,
} from '#/presentation/types/control-calidad/selector-bascula.types'

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
}

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
}: SelectorBasculaDialogProps) {
    const [alias, setAlias] = useState<string>('')

    // Cada báscula pendiente empieza con el campo en blanco.
    useEffect(() => {
        setAlias('')
    }, [pendienteDeAlias?.clave])

    const pidiendoAlias = pendienteDeAlias !== null

    return (
        <Dialog
            open={abierto}
            onOpenChange={(open) => { if (!open) onCerrar() }}
        >
            <DialogContent className="sm:max-w-md rounded-3xl border border-border-ui bg-surface p-6 shadow-clay-card outline-none">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black text-text-main">
                        {pidiendoAlias ? 'Nombre de la báscula' : 'Seleccionar báscula'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-text-muted">
                        {pidiendoAlias
                            ? 'Póngale un nombre para reconocerla la próxima vez.'
                            : 'Elija la báscula de su línea. Solo aparecen las que ya tienen permiso en este equipo.'}
                    </DialogDescription>
                </DialogHeader>

                {pidiendoAlias ? (
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
                                    <li key={bascula.clave}>
                                        <button
                                            type="button"
                                            onClick={() => onSeleccionar(bascula.clave)}
                                            className="cursor-pointer flex w-full items-center justify-between gap-3 rounded-2xl border border-border-ui bg-bg-app px-4 py-3 text-left transition-colors hover:border-brand"
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
