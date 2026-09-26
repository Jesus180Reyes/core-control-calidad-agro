import type { CSSProperties, ReactNode } from 'react'
import { Activity, Building2, Package, Scale, Usb } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'

interface ScaleConnectedDialogProps {
    open: boolean
    onClose: () => void
    /** Alias que el operario le puso a la báscula; `null` si nunca recibió uno. */
    alias: string | null
    baudRate: number
    pesoActual: number
    unidad: string
    cliente: string
    lote: string
    /** Lo que tarda en cerrarse solo; alimenta la barra de cuenta regresiva. */
    autoCloseMs: number
}

/**
 * El lienzo del diagrama. Todo se ubica en estas coordenadas: el SVG de las
 * líneas las usa tal cual y los nodos HTML las pasan a porcentaje con `at()`,
 * así el dibujo escala entero sin que los nodos se despeguen de sus líneas.
 */
const W = 320
const H = 460

const at = (x: number, y: number): CSSProperties => ({
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
})

/**
 * Las cuatro líneas del flujo. Las de arriba se dibujan del nodo al orbe y las
 * de abajo del orbe al nodo: el destello recorre el trazo en el sentido en que
 * está escrito, y es lo que hace que el dato "entre" y "salga" del sistema.
 */
const FLOW_LINES = [
    { d: 'M56 120 V138 Q56 148 66 148 H150 Q160 148 160 158 V170', color: 'var(--success)', delay: '0s' },
    { d: 'M264 120 V138 Q264 148 254 148 H170 Q160 148 160 158 V170', color: 'var(--success)', delay: '0.9s' },
    { d: 'M160 310 V334 Q160 344 150 344 H66 Q56 344 56 354 V364', color: 'var(--color-indigo-400)', delay: '0.45s' },
    { d: 'M160 310 V334 Q160 344 170 344 H254 Q264 344 264 354 V364', color: 'var(--color-indigo-400)', delay: '1.35s' },
]

/** Hasta dónde se "carga" el orbe al abrir. */
const CHARGE_LEVEL = '78%'

/**
 * Confirmación de que la báscula quedó conectada, inspirada en el diagrama de
 * flujo de energía de Ecoflow: la báscula y el puerto serial alimentan al
 * orbe central —que se llena como una batería y ya muestra la lectura viva— y
 * de ahí el dato sigue hacia el cliente y el lote de esta operación.
 *
 * No bloquea: se cierra solo, con el botón, con Esc o con un click afuera.
 */
export function ScaleConnectedDialog({
    open,
    onClose,
    alias,
    baudRate,
    pesoActual,
    unidad,
    cliente,
    lote,
    autoCloseMs,
}: ScaleConnectedDialogProps) {
    const nombreBascula = alias ?? 'Báscula'

    return (
        <Dialog open={open} onOpenChange={(abierto) => { if (!abierto) onClose() }}>
            <DialogContent
                showCloseButton={false}
                className="max-w-[400px] sm:max-w-[400px] gap-0 overflow-hidden rounded-[2.5rem] border border-border-ui bg-surface p-6 shadow-2xl"
            >
                <div className="flex flex-col items-center text-center">
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-success">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-success" />
                        </span>
                        En línea
                    </span>
                    <DialogTitle className="text-xl font-black text-text-main">
                        Báscula conectada
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-text-muted">
                        La lectura ya está llegando al sistema. Podés empezar a pesar.
                    </DialogDescription>
                </div>

                <div className="relative mx-auto mt-4 w-full max-w-[300px]" style={{ aspectRatio: `${W} / ${H}` }}>
                    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" fill="none" aria-hidden>
                        {FLOW_LINES.map((line) => (
                            <g key={line.d}>
                                <path d={line.d} className="stroke-text-muted/30" strokeWidth={1.5} />
                                <path
                                    d={line.d}
                                    pathLength={100}
                                    className="scale-flow"
                                    stroke={line.color}
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    style={{
                                        animationDelay: line.delay,
                                        filter: `drop-shadow(0 0 4px ${line.color})`,
                                    }}
                                />
                            </g>
                        ))}
                    </svg>

                    <FlowNode x={56} y={44} icon={<Scale className="size-6" />} label="Báscula" value={nombreBascula} />
                    <FlowNode x={264} y={44} icon={<Usb className="size-6" />} label="Puerto serial" value={`${baudRate} baud`} />
                    <FlowNode x={56} y={392} icon={<Building2 className="size-6" />} label="Cliente" value={cliente || '—'} />
                    <FlowNode x={264} y={392} icon={<Package className="size-6" />} label="Lote" value={lote || '—'} />

                    <div
                        className="absolute aspect-square -translate-x-1/2 -translate-y-1/2"
                        style={{ ...at(160, 240), width: `${(168 / W) * 100}%` }}
                    >
                        <div className="relative size-full overflow-hidden rounded-full bg-bg-app ring-1 ring-border-ui shadow-clay-card">
                            <div
                                className="scale-charge absolute inset-x-0 bottom-0 bg-linear-to-b from-success to-brand"
                                style={{ height: CHARGE_LEVEL }}
                            >
                                <svg
                                    viewBox="0 0 200 14"
                                    preserveAspectRatio="none"
                                    className="scale-wave absolute bottom-full left-0 h-3.5 w-[200%]"
                                    aria-hidden
                                >
                                    <path
                                        d="M0 7 Q12.5 0 25 7 T50 7 T75 7 T100 7 T125 7 T150 7 T175 7 T200 7 V14 H0 Z"
                                        fill="var(--success)"
                                    />
                                </svg>
                            </div>

                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-6 text-white animate-in fade-in-0 zoom-in-95 duration-700 delay-700"
                                style={{ animationFillMode: 'backwards' }}
                            >
                                <p className="flex items-baseline gap-1 leading-none">
                                    <span className="text-4xl font-black tabular-nums">{pesoActual.toFixed(2)}</span>
                                    <span className="text-xs font-bold lowercase opacity-90">{unidad}</span>
                                </p>
                                <span className="mt-2 text-[11px] font-semibold opacity-90">Lectura en vivo</span>
                                <span className="mt-1.5 max-w-full truncate rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-bold">
                                    {nombreBascula}
                                </span>
                            </div>
                        </div>

                        <span className="absolute right-[2%] top-[6%] flex size-10 items-center justify-center rounded-full bg-surface text-success ring-1 ring-border-ui shadow-clay-btn">
                            <Activity className="size-5 animate-pulse" />
                        </span>
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <CustomButton variant="primary" type="button" className="py-4" onClick={onClose}>
                        Empezar a pesar
                    </CustomButton>
                    <div className="h-1 overflow-hidden rounded-full bg-bg-app">
                        {open && (
                            <div
                                className="h-full origin-left rounded-full bg-success/60"
                                style={{ animation: `scale-countdown ${autoCloseMs}ms linear forwards` }}
                            />
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface FlowNodeProps {
    x: number
    y: number
    icon: ReactNode
    label: string
    value: string
}

/** Un extremo del flujo: el círculo con el ícono y, debajo, su dato. */
function FlowNode({ x, y, icon, label, value }: FlowNodeProps) {
    return (
        <div
            className="absolute flex w-28 -translate-x-1/2 -translate-y-7 flex-col items-center"
            style={at(x, y)}
        >
            <span className="flex size-14 items-center justify-center rounded-full bg-bg-app text-text-main ring-1 ring-border-ui shadow-clay-card">
                {icon}
            </span>
            <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
            <span className="max-w-full truncate text-sm font-black text-text-main">{value}</span>
        </div>
    )
}
