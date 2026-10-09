import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { clientColor } from '#/presentation/components/mirador/clientColors'
import { PlantActivityFeed } from '#/presentation/components/mirador/PlantActivityFeed'
import { PlantBrandCard } from '#/presentation/components/mirador/PlantBrandCard'
import { PlantBreadcrumbs } from '#/presentation/components/mirador/PlantBreadcrumbs'
import { PlantCanvas, type PlantCanvasHandle } from '#/presentation/components/mirador/PlantCanvas'
import { PlantControls } from '#/presentation/components/mirador/PlantControls'
import { LotWeighingsLoader } from '#/presentation/components/mirador/LotWeighingsLoader'
import { PlantKpiBar } from '#/presentation/components/mirador/PlantKpiBar'
import { useFullscreen } from '#/presentation/hooks/mirador/useFullscreen'
import { usePersistentFlag } from '#/presentation/hooks/mirador/usePersistentFlag'
import type { PlantTwin } from '#/presentation/hooks/mirador/usePlantTwin'
import type { PlantPickTarget, PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

import { ClientPanel } from './panel/ClientPanel'
import { LotPanel } from './panel/LotPanel'
import { PlantSummaryPanel } from './panel/PlantSummaryPanel'
import { WeighingPanel } from './panel/WeighingPanel'

const PANEL_W = 340
const GAP = 12
/** Desde este ancho el panel va al costado; debajo, es una hoja inferior. */
const ANCHO_PANEL_LATERAL = 768
const ANCHO_CON_ACTIVIDAD = 1024
const HOJA_PLEGADA = 76

const FONDO = {
    backgroundImage:
        'radial-gradient(color-mix(in srgb, var(--text-muted) 16%, transparent) 1px, transparent 1.3px),' +
        'radial-gradient(120% 90% at 35% 30%, var(--bg-app) 0%, color-mix(in srgb, var(--brand) 10%, var(--bg-app)) 100%)',
    backgroundSize: '22px 22px, 100% 100%',
}

/**
 * El Mirador: el tablero 3D de la planta con su HUD. Sólo pinta: el estado y la
 * lógica viven en `usePlantTwin`, y la escena en `PlantCanvas`.
 */
export function PlantTwinView({ twin }: { twin: PlantTwin }) {
    const { snapshot, events, seq, slots, activity, updatedAt, selection, level, select, goUp } = twin

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<PlantCanvasHandle>(null)
    const [tamanio, setTamanio] = useState({ w: 0, h: 0 })
    const [hojaAbierta, setHojaAbierta] = useState(false)
    const [kpisOcultos, setKpisOcultos] = usePersistentFlag('mirador-kpis-ocultos')
    const [actividadPlegada, setActividadPlegada] = usePersistentFlag('mirador-actividad-plegada')
    // Los pesajes del lote seleccionado, tal como los entrega `LotWeighingsLoader`.
    const [cargados, setCargados] = useState<{ lotId: number; weighings: PlantWeighing[] } | null>(null)
    const alCargarPesajes = useCallback((lotId: number, weighings: PlantWeighing[]) => setCargados({ lotId, weighings }), [])
    // Para el televisor de planta: el tablero solo, sin la barra lateral del portal.
    const pantallaCompleta = useFullscreen(rootRef)

    useEffect(() => {
        const el = rootRef.current
        if (!el) return
        const observador = new ResizeObserver(([entrada]) => setTamanio({ w: entrada.contentRect.width, h: entrada.contentRect.height }))
        observador.observe(el)
        return () => observador.disconnect()
    }, [])

    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') goUp() }
        window.addEventListener('keydown', alTeclear)
        return () => window.removeEventListener('keydown', alTeclear)
    }, [goUp])

    const lateral = tamanio.w >= ANCHO_PANEL_LATERAL
    const altoHoja = hojaAbierta ? Math.round(tamanio.h * 0.55) : HOJA_PLEGADA

    // En el teléfono, bajar de nivel abre la hoja: si no, el detalle queda escondido.
    useEffect(() => { if (!lateral && level !== 'planta') setHojaAbierta(true) }, [level, lateral])

    const cliente = selection.clientId !== null ? snapshot.clientes.find((c) => c.id === selection.clientId) ?? null : null
    const lote = cliente && selection.lotId !== null ? cliente.lotes.find((l) => l.id === selection.lotId) ?? null : null
    // `null` mientras llegan: los de otro lote no se muestran nunca en este.
    const pesajes = lote && cargados?.lotId === lote.id ? cargados.weighings : null
    const pesaje = lote && selection.weighingId !== null
        ? pesajes?.find((w) => w.id === selection.weighingId) ?? lote.ultimos_pesajes.find((w) => w.id === selection.weighingId) ?? null
        : null
    const color = cliente ? clientColor(slots.rows[cliente.id]) : ''

    // Lo que tapa el HUD, para que la escena se centre en lo que queda a la vista.
    const altoHud = kpisOcultos ? 110 : 170
    const insets = useMemo(
        () => (lateral ? { top: altoHud, right: PANEL_W + GAP * 2, bottom: 0 } : { top: altoHud + 40, right: 0, bottom: altoHoja }),
        [lateral, altoHoja, altoHud],
    )

    const alTocar = useCallback((t: PlantPickTarget | null) => {
        if (!t) return goUp()
        if (t.kind === 'cliente') select({ clientId: t.clientId })
        else if (t.kind === 'lote') select({ clientId: t.clientId, lotId: t.lotId })
        else if (t.kind === 'pesaje') select({ clientId: t.clientId, lotId: t.lotId, weighingId: t.weighingId })
        else select({})
    }, [goUp, select])

    let contenido
    if (!cliente) contenido = <PlantSummaryPanel snapshot={snapshot} slots={slots} onSelect={select} />
    else if (!lote) contenido = <ClientPanel client={cliente} color={color} onSelect={select} />
    else contenido = (
        <>
            <LotWeighingsLoader lotId={lote.id} onLoad={alCargarPesajes} />
            {pesajes && (pesaje
                ? <WeighingPanel client={cliente} lot={lote} color={color} weighing={pesaje} weighings={pesajes} onSelect={select} />
                : <LotPanel client={cliente} lot={lote} color={color} weighings={pesajes} onSelect={select} />)}
        </>
    )

    const tituloHoja = pesaje ? `Pesaje #${pesaje.id}` : lote ? `Lote ${lote.nombre_lote}` : cliente ? cliente.nombre : 'Clientes en planta'

    return (
        <div
            ref={rootRef}
            className={`relative isolate h-full w-full overflow-hidden bg-bg-app animate-in fade-in duration-500 ${pantallaCompleta.active ? '' : 'rounded-[28px] border border-border-ui/60 shadow-clay-card'}`}
            style={FONDO}
        >
            <PlantCanvas
                ref={canvasRef}
                snapshot={snapshot}
                slots={slots}
                events={events}
                seq={seq}
                selection={selection}
                weighings={pesajes}
                insets={insets}
                onPick={alTocar}
            />

            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2.5" style={{ right: lateral ? PANEL_W + GAP * 2 : GAP }}>
                <div className="flex min-w-0 flex-wrap items-stretch gap-2.5">
                    <PlantBrandCard updatedAt={updatedAt} kpisHidden={kpisOcultos} onToggleKpis={() => setKpisOcultos(!kpisOcultos)} />
                    {!kpisOcultos && <PlantKpiBar kpis={snapshot.kpis} clientCount={snapshot.clientes.length} />}
                </div>
                <PlantBreadcrumbs level={level} selection={selection} clientName={cliente?.nombre ?? null} lotName={lote?.nombre_lote ?? null} onSelect={select} />
            </div>

            {lateral ? (
                <aside
                    aria-live="polite"
                    className="absolute top-3 right-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-[22px] border border-border-ui/70 bg-surface/92 shadow-clay-card backdrop-blur-xl pointer-coarse:bg-surface/97 pointer-coarse:backdrop-blur-none"
                    style={{ width: PANEL_W }}
                >
                    <div key={`${level}-${selection.clientId}-${selection.lotId}-${selection.weighingId}`} className="min-h-0 flex-1 overflow-y-auto p-5 animate-in fade-in slide-in-from-right-2 duration-300 motion-reduce:animate-none">
                        {contenido}
                    </div>
                </aside>
            ) : (
                <aside
                    aria-live="polite"
                    className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[22px] border border-border-ui/70 bg-surface/95 shadow-clay-card backdrop-blur-xl pointer-coarse:bg-surface/97 pointer-coarse:backdrop-blur-none transition-[height] duration-300 ease-out motion-reduce:transition-none"
                    style={{ height: altoHoja }}
                >
                    <button
                        type="button"
                        onClick={() => setHojaAbierta(!hojaAbierta)}
                        aria-expanded={hojaAbierta}
                        className="flex shrink-0 flex-col items-center gap-2 px-5 pt-2.5 pb-3"
                    >
                        <span aria-hidden className="h-1 w-10 rounded-full bg-border-ui" />
                        <span className="w-full truncate text-left text-sm font-bold text-text-main">{tituloHoja}</span>
                    </button>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{contenido}</div>
                </aside>
            )}

            {lateral && tamanio.w >= ANCHO_CON_ACTIVIDAD && (
                <PlantActivityFeed
                    entries={activity}
                    collapsed={actividadPlegada}
                    onToggle={() => setActividadPlegada(!actividadPlegada)}
                    className="absolute bottom-3 left-3 z-10 w-85"
                />
            )}

            <PlantControls
                vertical={!lateral}
                onZoomIn={() => canvasRef.current?.zoomBy(1 / 1.25)}
                onZoomOut={() => canvasRef.current?.zoomBy(1.25)}
                onHome={() => select({})}
                onToggleFullscreen={pantallaCompleta.supported ? pantallaCompleta.toggle : undefined}
                fullscreen={pantallaCompleta.active}
                className="absolute z-10"
                style={lateral ? { right: PANEL_W + GAP * 2, bottom: GAP } : { right: GAP, bottom: altoHoja + GAP }}
            />
        </div>
    )
}
