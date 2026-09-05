import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, House, Radio } from 'lucide-react'


export function NotFound() {
    const router = useRouter()
    const pathname = useRouterState({ select: (estado) => estado.location.pathname })

    const volver = () => {
        if (router.history.canGoBack()) {
            router.history.back()
            return
        }

        router.navigate({ to: '/' })
    }

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg-app px-6 py-16">
            <BackdropDecoration />

            <div className="w-full max-w-xl">
                <div className="rounded-4xl border border-border-ui bg-surface p-6 shadow-clay-card sm:p-10">
                    <div className="flex justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border-ui bg-bg-app px-3 py-1.5 text-[11px] font-bold tracking-widest text-text-muted uppercase">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-70" />
                                <span className="relative inline-flex size-2 rounded-full bg-warning" />
                            </span>
                            Error 404
                        </span>
                    </div>

                    <ScaleDisplay />

                    <div className="mt-8 space-y-3 text-center">
                        <h1 className="text-2xl font-extrabold tracking-tight text-text-main sm:text-3xl">
                            Esta ruta no está en la báscula
                        </h1>

                        <p className="mx-auto max-w-md text-sm leading-relaxed text-text-muted">
                            La página que buscás no existe, cambió de dirección o se escribió
                            mal. Volvé al panel y seguí desde ahí.
                        </p>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <code className="max-w-full truncate rounded-xl border border-border-ui bg-bg-app px-3 py-2 font-mono text-xs text-text-muted">
                            {pathname}
                        </code>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3F3FD4] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition-all hover:bg-[#3434B8] active:scale-[0.98] dark:shadow-none"
                        >
                            <House className="size-4 shrink-0" />
                            Ir al panel
                        </Link>

                        <button
                            type="button"
                            onClick={volver}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border-ui bg-bg-app px-6 py-4 text-sm font-bold text-text-main transition-all hover:bg-muted active:scale-[0.98]"
                        >
                            <ArrowLeft className="size-4 shrink-0" />
                            Volver atrás
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-text-muted">
                    Core Control Calidad Agro · Sistema industrial de pesaje
                </p>
            </div>
        </div>
    )
}

/** Display del indicador: el 404 sobre los dígitos fantasma del siete segmentos. */
function ScaleDisplay() {
    return (
        <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-6 py-7 shadow-[inset_0_2px_16px_rgba(0,0,0,0.6)]">
            {/* Reflejo diagonal del vidrio del display. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(148,163,184,0.10)_50%,transparent_62%)]"
            />

            <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                <span className="inline-flex items-center gap-1.5">
                    <Radio className="size-3" />
                    Indicador
                </span>
                <span className="inline-flex items-center gap-1.5 text-warning">
                    <span className="size-1.5 animate-pulse rounded-full bg-warning" />
                    Sin señal
                </span>
            </div>

            <div className="mt-4 flex items-baseline justify-center gap-3 font-mono">
                <span className="relative text-6xl font-bold tabular-nums tracking-[0.12em] text-emerald-400 sm:text-7xl">
                    {/* Los segmentos apagados detrás de la cifra, como en el equipo real. */}
                    <span aria-hidden className="absolute inset-0 text-emerald-400/10">
                        888
                    </span>
                    404
                </span>

                <span className="text-lg font-semibold text-emerald-400/50">kg</span>
            </div>

            <div className="mt-4 flex justify-center gap-4 text-[10px] font-bold tracking-[0.18em] text-slate-600 uppercase">
                <span>Estable</span>
                <span>Tara</span>
                <span className="text-emerald-400/70">Neto</span>
            </div>
        </div>
    )
}

/** Rejilla difuminada y halos de marca. Puramente decorativo. */
function BackdropDecoration() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div
                className="absolute inset-0 opacity-60 dark:opacity-40"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, rgba(100,116,139,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.18) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    maskImage:
                        'radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 100%)',
                    WebkitMaskImage:
                        'radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 100%)',
                }}
            />

            <div className="absolute -top-40 left-1/2 size-112 -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
            <div className="absolute -bottom-48 right-[15%] size-80 rounded-full bg-brand/10 blur-[120px]" />
        </div>
    )
}
