import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'

import type { PlantLevel, PlantSelection } from '#/presentation/types/mirador/plantTwin.types'

import { GLASS } from './format'

interface PlantBreadcrumbsProps {
    level: PlantLevel
    selection: PlantSelection
    clientName: string | null
    lotName: string | null
    onSelect: (selection: Partial<PlantSelection>) => void
}

/** Planta › Cliente › Lote › Pesaje: dónde está parado el usuario y por dónde se vuelve. */
export function PlantBreadcrumbs({ level, selection, clientName, lotName, onSelect }: PlantBreadcrumbsProps) {
    const tramos: { key: PlantLevel; label: string; go: Partial<PlantSelection> }[] = [{ key: 'planta', label: 'Planta', go: {} }]
    if (selection.clientId !== null && clientName) tramos.push({ key: 'cliente', label: clientName, go: { clientId: selection.clientId } })
    if (selection.lotId !== null && lotName) tramos.push({ key: 'lote', label: lotName, go: { clientId: selection.clientId, lotId: selection.lotId } })
    if (selection.weighingId !== null) tramos.push({ key: 'pesaje', label: `Pesaje #${selection.weighingId}`, go: selection })

    return (
        <nav aria-label="Nivel de la vista" className={`${GLASS} flex max-w-full items-center gap-0.5 self-start overflow-x-auto p-1 [scrollbar-width:none]`}>
            {tramos.map((t, i) => (
                <Fragment key={t.key}>
                    {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-text-muted/50" strokeWidth={2.4} aria-hidden />}
                    <button
                        type="button"
                        onClick={() => onSelect(t.go)}
                        aria-current={t.key === level ? 'page' : undefined}
                        className={`whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                            t.key === level ? 'bg-brand text-primary-foreground' : 'text-text-muted hover:bg-muted hover:text-text-main'
                        }`}
                    >
                        {t.label}
                    </button>
                </Fragment>
            ))}
        </nav>
    )
}
