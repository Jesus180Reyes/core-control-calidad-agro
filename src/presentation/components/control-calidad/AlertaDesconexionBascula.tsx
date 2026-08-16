import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { EstadoBascula, InfoDesconexion, MotivoDesconexion } from '#/presentation/types/control-calidad/bascula.types'

interface AlertaDesconexionBasculaProps {
    desconexion: InfoDesconexion | null
    estado: EstadoBascula
    intentoReconexion: number
    maxIntentos: number
    onReintentar: () => void
    onCerrar: () => void
    /** Emite un pitido de alerta al detectarse el corte. */
    conSonido?: boolean
    /** Hace parpadear el título de la pestaña mientras el aviso está activo. */
    parpadearTitulo?: boolean
}

interface CopyAviso {
    titulo: string
    accion: string
}

const COPY_POR_MOTIVO: Record<MotivoDesconexion, CopyAviso> = {
    cable: {
        titulo: 'Báscula desconectada',
        accion: 'Revise el cable USB / adaptador serial y vuelva a conectar la báscula.',
    },
    'sin-senal': {
        titulo: 'Báscula sin señal',
        accion: 'El puerto sigue abierto, pero el indicador dejó de transmitir. Verifique que esté encendido y que el cable serial esté firme.',
    },
    stream: {
        titulo: 'Comunicación interrumpida',
        accion: 'La báscula cerró el envío de datos. Reintente la conexión.',
    },
    error: {
        titulo: 'Error de comunicación',
        accion: 'Ocurrió un error en el puerto serial. Reintente la conexión.',
    },
    usuario: {
        titulo: 'Báscula desconectada',
        accion: 'La conexión fue cerrada desde el sistema.',
    },
}

/** Pitido de alerta con WebAudio (no requiere archivos de audio). */
function reproducirPitidoAlerta() {
    try {
        const CtxAudio = window.AudioContext
            ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!CtxAudio) return

        const ctx = new CtxAudio()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'square'
        osc.frequency.value = 880
        osc.connect(gain)
        gain.connect(ctx.destination)

        const t0 = ctx.currentTime
        gain.gain.setValueAtTime(0, t0)
        // Tres pitidos cortos.
        for (let i = 0; i < 3; i++) {
            const inicio = t0 + i * 0.3
            gain.gain.setValueAtTime(0.06, inicio)
            gain.gain.setValueAtTime(0, inicio + 0.15)
        }

        osc.start(t0)
        osc.stop(t0 + 0.95)
        osc.onended = () => void ctx.close().catch(() => { })
    } catch {
        /* El navegador puede bloquear el audio sin interacción previa: se ignora. */
    }
}

/** Alerta sonora + parpadeo del título, para que el operario lo note aunque no mire la pantalla. */
function useAvisoFueraDePantalla(
    desconexion: InfoDesconexion | null,
    conSonido: boolean,
    parpadearTitulo: boolean,
) {
    const ultimoAvisadoRef = useRef<number | null>(null)

    useEffect(() => {
        if (!desconexion) {
            ultimoAvisadoRef.current = null
            return
        }
        if (ultimoAvisadoRef.current === desconexion.timestamp) return
        ultimoAvisadoRef.current = desconexion.timestamp
        if (conSonido) reproducirPitidoAlerta()
    }, [desconexion, conSonido])

    useEffect(() => {
        if (!desconexion || !parpadearTitulo || typeof document === 'undefined') return

        const tituloOriginal = document.title
        const tituloAlerta = desconexion.recuperable
            ? '⚠️ BÁSCULA SIN SEÑAL'
            : '⚠️ BÁSCULA DESCONECTADA'
        let visible = false

        document.title = tituloAlerta
        const id = setInterval(() => {
            visible = !visible
            document.title = visible ? tituloOriginal : tituloAlerta
        }, 1200)

        return () => {
            clearInterval(id)
            document.title = tituloOriginal
        }
    }, [desconexion, parpadearTitulo])
}

export function AlertaDesconexionBascula({
    desconexion,
    estado,
    intentoReconexion,
    maxIntentos,
    onReintentar,
    onCerrar,
    conSonido = true,
    parpadearTitulo = true,
}: AlertaDesconexionBasculaProps) {

    useAvisoFueraDePantalla(desconexion, conSonido, parpadearTitulo)

    if (!desconexion) return null

    const copy = COPY_POR_MOTIVO[desconexion.motivo]
    const reconectando = estado === 'reconectando' || estado === 'conectando'
    const esAdvertencia = desconexion.recuperable

    const colorAcento = esAdvertencia
        ? { borde: 'border-amber-500', fondoIcono: 'bg-amber-500', sombra: 'shadow-amber-500/20', texto: 'text-amber-600 dark:text-amber-500' }
        : { borde: 'border-red-500', fondoIcono: 'bg-red-600', sombra: 'shadow-red-500/20', texto: 'text-red-600 dark:text-red-500' }

    return (
        <Dialog open onOpenChange={(abierto) => { if (!abierto) onCerrar() }}>
            <DialogContent
                showCloseButton={false}
                className={`max-w-[460px] rounded-[2.5rem] border-2 ${colorAcento.borde} bg-white dark:bg-zinc-950 p-8 shadow-2xl outline-none`}
            >
                <DialogHeader className="hidden">
                    <DialogTitle>{copy.titulo}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 ${colorAcento.fondoIcono} rounded-2xl flex items-center justify-center shadow-lg ${colorAcento.sombra} mb-6 animate-pulse`}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        {copy.titulo}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed px-2 mb-5">
                        {desconexion.mensaje}
                    </p>

                    {desconexion.interrumpioPesaje && (
                        <div className="w-full rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 px-4 py-3 mb-5">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 leading-relaxed">
                                El pesaje en curso quedó invalidado. Retire el producto, reconecte la báscula y repita la muestra.
                            </p>
                        </div>
                    )}

                    <div className="w-full grid grid-cols-2 gap-3 mb-6">
                        <DatoAviso etiqueta="Hora del corte" valor={desconexion.hora} />
                        <DatoAviso
                            etiqueta="Última lectura"
                            valor={`${desconexion.pesoAlDesconectar.toLocaleString('es-HN')} g`}
                        />
                    </div>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed px-2 mb-6">
                        {copy.accion}
                    </p>

                    {reconectando && (
                        <div className={`flex items-center justify-center gap-2 mb-5 text-xs font-black uppercase tracking-wider ${colorAcento.texto}`}>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Reintentando conexión ({intentoReconexion}/{maxIntentos})
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        <button
                            onClick={onReintentar}
                            className="w-full bg-[#3F3FD4] hover:bg-[#3434B8] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                        >
                            Reintentar conexión
                        </button>

                        <button
                            onClick={onCerrar}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-slate-100 dark:hover:bg-zinc-800/80 active:scale-[0.98] cursor-pointer"
                        >
                            Entendido, seguir sin báscula
                        </button>
                    </div>

                    <span className="text-[10px] italic text-slate-400 dark:text-zinc-500 mt-6 block">
                        No registre pesajes manualmente sin verificar antes el estado del equipo.
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function DatoAviso({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div className="rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900 px-4 py-3">
            <span className="block text-[10px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase mb-1">
                {etiqueta}
            </span>
            <span className="block text-sm font-black text-slate-800 dark:text-zinc-200">
                {valor}
            </span>
        </div>
    )
}

interface BannerEstadoBasculaProps {
    estado: EstadoBascula
    isSupported: boolean
    senalRestablecida: boolean
    intentoReconexion: number
    maxIntentos: number
    onReintentar: () => void
}

/**
 * Tira permanente de estado: sigue avisando aunque el operario cierre el modal,
 * y confirma en verde cuando la señal vuelve.
 */
export function BannerEstadoBascula({
    estado,
    isSupported,
    senalRestablecida,
    intentoReconexion,
    maxIntentos,
    onReintentar,
}: BannerEstadoBasculaProps) {

    if (senalRestablecida && (estado === 'conectada' || estado === 'sin-senal')) {
        return (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Comunicación con la báscula restablecida.
                </span>
            </div>
        )
    }

    if (estado === 'conectada') return null

    if (!isSupported || estado === 'no-soportada') {
        return (
            <FranjaAviso tono="neutro">
                Este navegador no permite leer la báscula. Abra el sistema en Chrome o Edge de escritorio.
            </FranjaAviso>
        )
    }

    if (estado === 'sin-senal') {
        return (
            <FranjaAviso tono="advertencia" onReintentar={onReintentar}>
                Puerto abierto, pero la báscula no está enviando lecturas. Revise el indicador y el cable serial.
            </FranjaAviso>
        )
    }

    if (estado === 'reconectando') {
        return (
            <FranjaAviso tono="advertencia">
                Reconectando con la báscula… intento {intentoReconexion} de {maxIntentos}.
            </FranjaAviso>
        )
    }

    if (estado === 'error') {
        return (
            <FranjaAviso tono="critico" onReintentar={onReintentar}>
                Error de comunicación con la báscula. No se pueden registrar pesajes.
            </FranjaAviso>
        )
    }

    if (estado === 'conectando') return null

    return (
        <FranjaAviso tono="critico" onReintentar={onReintentar}>
            Báscula desconectada. No se pueden registrar pesajes hasta restablecer la conexión.
        </FranjaAviso>
    )
}

interface FranjaAvisoProps {
    tono: 'critico' | 'advertencia' | 'neutro'
    children: ReactNode
    onReintentar?: () => void
}

function FranjaAviso({ tono, children, onReintentar }: FranjaAvisoProps) {
    const estilos = {
        critico: {
            caja: 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20',
            punto: 'bg-red-500',
            texto: 'text-red-700 dark:text-red-400',
            boton: 'text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40',
        },
        advertencia: {
            caja: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20',
            punto: 'bg-amber-500',
            texto: 'text-amber-700 dark:text-amber-500',
            boton: 'text-amber-700 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-950/40',
        },
        neutro: {
            caja: 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900',
            punto: 'bg-slate-400',
            texto: 'text-slate-600 dark:text-zinc-300',
            boton: 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800',
        },
    }[tono]

    return (
        <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-4 ${estilos.caja}`}>
            <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${estilos.punto}`} />
                <span className={`text-sm font-bold ${estilos.texto}`}>{children}</span>
            </div>
            {onReintentar && (
                <button
                    onClick={onReintentar}
                    className={`shrink-0 text-xs font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-colors cursor-pointer ${estilos.boton}`}
                >
                    Reintentar
                </button>
            )}
        </div>
    )
}
