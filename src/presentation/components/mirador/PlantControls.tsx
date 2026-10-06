import type { CSSProperties } from 'react'
import { Crosshair, Maximize, Minimize, Minus, Plus } from 'lucide-react'

import { GLASS } from './format'

interface PlantControlsProps {
    onZoomIn: () => void
    onZoomOut: () => void
    onHome: () => void
    /** Sin este callback (navegador sin Fullscreen API) el botón no se pinta. */
    onToggleFullscreen?: () => void
    fullscreen?: boolean
    vertical?: boolean
    className?: string
    /** La posición depende del panel, que se mide en píxeles. */
    style?: CSSProperties
}

const BOTON = 'grid size-9 place-items-center rounded-xl text-text-main transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand'

/** Acercar, alejar, volver a ver la planta entera y pasar a pantalla completa. */
export function PlantControls({ onZoomIn, onZoomOut, onHome, onToggleFullscreen, fullscreen = false, vertical = false, className = '', style }: PlantControlsProps) {
    const etiquetaPantalla = fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
    return (
        <div role="toolbar" aria-label="Controles de la vista" style={style} className={`${GLASS} flex gap-0.5 p-1 ${vertical ? 'flex-col' : 'items-center'} ${className}`}>
            <button type="button" className={BOTON} onClick={onZoomIn} aria-label="Acercar"><Plus className="size-4" strokeWidth={2.4} /></button>
            <button type="button" className={BOTON} onClick={onZoomOut} aria-label="Alejar"><Minus className="size-4" strokeWidth={2.4} /></button>
            <span aria-hidden className={vertical ? 'mx-auto my-0.5 h-px w-5 bg-border-ui' : 'mx-0.5 h-5 w-px bg-border-ui'} />
            <button type="button" className={BOTON} onClick={onHome} aria-label="Volver a la planta" title="Volver a la planta"><Crosshair className="size-4" strokeWidth={2.2} /></button>
            {onToggleFullscreen && (
                <button type="button" className={BOTON} onClick={onToggleFullscreen} aria-label={etiquetaPantalla} aria-pressed={fullscreen} title={etiquetaPantalla}>
                    {fullscreen ? <Minimize className="size-4" strokeWidth={2.2} /> : <Maximize className="size-4" strokeWidth={2.2} />}
                </button>
            )}
        </div>
    )
}
