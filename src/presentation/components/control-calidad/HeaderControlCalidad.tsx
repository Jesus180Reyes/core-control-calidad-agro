import type { EstadoBascula } from "#/presentation/types/control-calidad/bascula.types"
import { CustomButton } from "../shared/button/CustomButton"

interface HeaderProps {
    estado: EstadoBascula
    error: string | null
    intentoReconexion: number
    maxIntentos: number
    onConnect: () => void
    onDisconnect: () => void
    onReintentar: () => void
    onVolver: () => void
}

interface DescriptorEstado {
    etiqueta: string
    punto: string
    pill: string
}

const DESCRIPTORES: Record<EstadoBascula, DescriptorEstado> = {
    conectada: {
        etiqueta: 'Báscula en línea',
        punto: 'bg-emerald-500 animate-pulse',
        pill: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    },
    'sin-senal': {
        etiqueta: 'Sin señal',
        punto: 'bg-amber-500 animate-pulse',
        pill: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500',
    },
    conectando: {
        etiqueta: 'Conectando…',
        punto: 'bg-blue-500 animate-pulse',
        pill: 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    },
    reconectando: {
        etiqueta: 'Reconectando…',
        punto: 'bg-amber-500 animate-pulse',
        pill: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500',
    },
    desconectada: {
        etiqueta: 'Desconectada',
        punto: 'bg-red-500',
        pill: 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    },
    error: {
        etiqueta: 'Error de puerto',
        punto: 'bg-red-500 animate-pulse',
        pill: 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    },
    'no-soportada': {
        etiqueta: 'Navegador no compatible',
        punto: 'bg-slate-400',
        pill: 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400',
    },
}

export function HeaderControlCalidad({
    estado,
    error,
    intentoReconexion,
    maxIntentos,
    onConnect,
    onDisconnect,
    onReintentar,
    onVolver,
}: HeaderProps) {

    const descriptor = DESCRIPTORES[estado]
    const enTransicion = estado === 'conectando' || estado === 'reconectando'
    const puertoAbierto = estado === 'conectada' || estado === 'sin-senal'

    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onVolver}
                    aria-label="Volver a clientes"
                    className="p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg text-slate-500 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                    Proceso de Pesaje (Báscula en Vivo)
                </span>
            </div>

            <div className="flex items-center gap-3">
                {error && !puertoAbierto && (
                    <span className="max-w-70 text-xs text-red-500 font-medium truncate" title={error}>
                        {error}
                    </span>
                )}

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider ${descriptor.pill}`}>
                    <span className={`w-2 h-2 rounded-full ${descriptor.punto}`} />
                    {descriptor.etiqueta}
                    {estado === 'reconectando' && ` (${intentoReconexion}/${maxIntentos})`}
                </div>

                {puertoAbierto ? (
                    <div className="flex items-center gap-2">
                        {estado === 'sin-senal' && (
                            <CustomButton
                                variant="secondary"
                                onClick={onReintentar}
                                className="w-32 h-12.5 p-3 text-xs"
                            >
                                Reintentar
                            </CustomButton>
                        )}
                        <CustomButton
                            variant="secondary"
                            onClick={onDisconnect}
                            className="w-36 h-12.5 p-3 text-xs"
                        >
                            Desconectar
                        </CustomButton>
                    </div>
                ) : (
                    <CustomButton
                        variant="primary"
                        onClick={onConnect}
                        isLoading={enTransicion}
                        disabled={estado === 'no-soportada' || enTransicion}
                        className="w-50 h-12.5 p-3 text-sm"
                    >
                        {enTransicion ? 'Conectando…' : 'Conectar Báscula'}
                    </CustomButton>
                )}
            </div>
        </header>
    )
}
