import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

import { AppIcon } from '#/presentation/components/shared/AppIcon'
import { FOTO_VIEJA_MS } from '#/presentation/hooks/mirador/usePlantTwin'

import { GLASS } from './format'

interface PlantBrandCardProps {
    updatedAt: number
    kpisHidden: boolean
    onToggleKpis: () => void
}

/** Marca del módulo, el pulso "en vivo" y el botón que esconde los indicadores. */
export function PlantBrandCard({ updatedAt, kpisHidden, onToggleKpis }: PlantBrandCardProps) {
    const [ahora, setAhora] = useState(() => Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setAhora(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const atraso = ahora - updatedAt
    const vieja = atraso > FOTO_VIEJA_MS
    const hora = new Date(ahora).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', hour12: false })

    return (
        <div className={`${GLASS} flex items-center gap-3 py-2 pl-2 pr-2`}>
            <AppIcon className="size-10 rounded-xl" />
            <div className="min-w-0 leading-tight">
                <p className="text-[15px] font-extrabold tracking-tight text-text-main">Mirador</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted tabular-nums">
                    <span
                        aria-hidden
                        className={`size-1.5 rounded-full ${vieja ? 'bg-warning' : 'bg-success animate-pulse'}`}
                    />
                    {vieja ? `Sin actualizar hace ${Math.round(atraso / 1000)} s` : `En vivo · ${hora}`}
                    <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[9.5px] max-sm:hidden font-bold uppercase tracking-[0.08em]">
                        Datos de ejemplo
                    </span>
                </p>
            </div>
            <button
                type="button"
                onClick={onToggleKpis}
                aria-expanded={!kpisHidden}
                aria-controls="mirador-kpis"
                title={kpisHidden ? 'Mostrar indicadores' : 'Ocultar indicadores'}
                className="ml-1 grid size-8 shrink-0 place-items-center rounded-xl text-text-muted transition-colors hover:bg-muted hover:text-text-main focus-visible:outline-2 focus-visible:outline-brand"
            >
                <ChevronLeft className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${kpisHidden ? 'rotate-180' : ''}`} strokeWidth={2.4} />
            </button>
        </div>
    )
}
