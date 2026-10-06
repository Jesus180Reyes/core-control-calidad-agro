import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { MonitorX } from 'lucide-react'

import { EmptyState } from '#/presentation/components/shared/EmptyState'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import type { PlantEvent, PlantPickTarget, PlantSelection, PlantSnapshot, PlantWeighing, SlotMap } from '#/presentation/types/mirador/plantTwin.types'

import type { PlantScene, SceneInsets } from './scene/PlantScene'

export interface PlantCanvasHandle {
    zoomBy: (factor: number) => void
}

interface PlantCanvasProps {
    snapshot: PlantSnapshot
    slots: SlotMap
    events: PlantEvent[]
    seq: number
    selection: PlantSelection
    /** Pesajes del lote seleccionado, para la diana 3D. */
    weighings: PlantWeighing[] | null
    insets: SceneInsets
    onPick: (target: PlantPickTarget | null) => void
    ref?: Ref<PlantCanvasHandle>
}

/**
 * Monta la escena three.js. `three` se importa recién acá y de forma diferida:
 * ninguna otra ruta lo descarga. La escena vive en un ref y recibe todo por
 * métodos; React no la re-renderiza.
 */
export function PlantCanvas({ snapshot, slots, events, seq, selection, weighings, insets, onPick, ref }: PlantCanvasProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const labelsRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<PlantScene | null>(null)
    const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando')

    // Lo último que llegó por props, para aplicarlo cuando la escena termine de cargar.
    const ultimo = useRef({ snapshot, slots, events, seq, selection, weighings, insets, onPick })
    ultimo.current = { snapshot, slots, events, seq, selection, weighings, insets, onPick }

    useEffect(() => {
        let cancelado = false
        import('./scene/PlantScene')
            .then(({ PlantScene: Escena }) => {
                if (cancelado || !hostRef.current || !labelsRef.current) return
                try {
                    const escena = new Escena(hostRef.current, labelsRef.current, { onPick: (t) => ultimo.current.onPick(t) })
                    sceneRef.current = escena
                    const p = ultimo.current
                    escena.setInsets(p.insets)
                    escena.setSelection(p.selection, p.weighings)
                    escena.apply(p.snapshot, p.slots, p.events, p.seq)
                    setEstado('lista')
                } catch {
                    setEstado('error')
                }
            })
            .catch(() => { if (!cancelado) setEstado('error') })

        // El tema es una clase en <html>: la escena se recolorea al cambiarla.
        const observador = new MutationObserver(() => sceneRef.current?.setTheme())
        observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

        return () => {
            cancelado = true
            observador.disconnect()
            sceneRef.current?.dispose()
            sceneRef.current = null
        }
    }, [])

    useEffect(() => { sceneRef.current?.apply(snapshot, slots, events, seq) }, [snapshot, slots, events, seq])
    useEffect(() => { sceneRef.current?.setSelection(selection, weighings) }, [selection, weighings])
    useEffect(() => { sceneRef.current?.setInsets({ top: insets.top, right: insets.right, bottom: insets.bottom }) }, [insets.top, insets.right, insets.bottom])

    useImperativeHandle(ref, () => ({ zoomBy: (f) => sceneRef.current?.zoomBy(f) }), [])

    return (
        <div className="absolute inset-0">
            <div ref={hostRef} className="absolute inset-0" aria-label="Tablero 3D de la planta: un territorio por cliente, sus lotes por etapa y cada pesaje como una ficha" role="img" />
            <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

            {estado === 'cargando' && <LoadingState size="lg" className="absolute inset-0" />}

            {estado === 'error' && (
                <div className="absolute inset-0 grid place-items-center p-6">
                    <EmptyState
                        className="max-w-md bg-surface/90"
                        icon={<MonitorX className="size-8" strokeWidth={1.8} />}
                        title="Este equipo no puede dibujar el tablero 3D"
                        description="El navegador no tiene WebGL disponible o la aceleración por hardware está apagada. Los indicadores y el panel siguen funcionando."
                    />
                </div>
            )}
        </div>
    )
}
