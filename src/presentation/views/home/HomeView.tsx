import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ClipboardCheck, FileText, History, Printer, Scale, Sparkles, Telescope, Users } from 'lucide-react'

import { AgriAvatar } from '#/presentation/components/agri/AgriAvatar'
import { getInitials } from '#/presentation/components/shared/getInitials'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { usePermissions } from '#/presentation/hooks/auth/usePermissions'
import { PERMISSIONS, type Permission } from '#/presentation/types/auth/permissions'

interface QuickAction {
    title: string
    description: string
    to: string
    icon: ReactNode
    permission: Permission
    /** Clases del chip del ícono: cada acceso lleva su propio acento. */
    accent: string
}

// Los mismos destinos y permisos que el Sidebar: la portada no abre puertas
// que la barra lateral no muestra.
const QUICK_ACTIONS: QuickAction[] = [
    {
        title: 'Registrar pesaje',
        description: 'Elegí el cliente y el lote, y pesá con la báscula conectada.',
        to: '/clientes',
        icon: <Scale className="size-5" strokeWidth={2.2} />,
        permission: PERMISSIONS.MODULOCONTROLCALIDAD,
        accent: 'bg-brand/12 text-brand',
    },
    {
        title: 'Historial de pesajes',
        description: 'Revisá lo registrado y reimprimí las etiquetas.',
        to: '/historial',
        icon: <History className="size-5" strokeWidth={2.2} />,
        permission: PERMISSIONS.MODULOCONTROLCALIDAD,
        accent: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
    },
    {
        title: 'Clientes',
        description: 'Inspeccioná clientes, sus lotes y el estado de calidad.',
        to: '/inspeccion-clientes',
        icon: <Users className="size-5" strokeWidth={2.2} />,
        permission: PERMISSIONS.MODULOCLIENTES,
        accent: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    },
    {
        title: 'Documentos fiscales',
        description: 'Administrá los documentos fiscales de cada operación.',
        to: '/administracion-documentos-fiscales',
        icon: <FileText className="size-5" strokeWidth={2.2} />,
        permission: PERMISSIONS.MODULOADMINISTRACION,
        accent: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
    },
]

const WORKFLOW_STEPS = [
    {
        title: 'Seleccioná',
        description: 'Cliente y lote a inspeccionar.',
        icon: <ClipboardCheck className="size-4.5" strokeWidth={2.2} />,
    },
    {
        title: 'Pesá',
        description: 'La báscula estabiliza y valida el rango.',
        icon: <Scale className="size-4.5" strokeWidth={2.2} />,
    },
    {
        title: 'Etiquetá',
        description: 'Cada pesaje cierra con su ticket impreso.',
        icon: <Printer className="size-4.5" strokeWidth={2.2} />,
    },
]

/** El saludo según la hora de la estación, no la del servidor. */
function greetingFor(hora: number): string {
    if (hora < 12) return 'Buenos días'
    if (hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
}

/**
 * La portada del portal: lo primero que se ve al entrar. Saluda, recuerda el
 * flujo de trabajo y ofrece los accesos que los permisos de la sesión habilitan.
 */
export function HomeView() {
    const { usuario } = useAuth()
    const { has } = usePermissions()

    const accesos = QUICK_ACTIONS.filter((accion) => has(accion.permission))

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <WelcomeHero nombreCompleto={usuario?.complete_name} rol={usuario?.rol} />

            <section className="space-y-4">
                <SectionTitle title="Accesos rápidos" subtitle="Retomá tu trabajo desde acá." />

                {accesos.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {accesos.map((accion, indice) => (
                            <QuickActionCard key={accion.to} action={accion} index={indice} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[28px] border border-dashed border-border-ui p-10 text-center">
                        <p className="text-sm font-bold text-text-main">Todavía no tenés módulos habilitados</p>
                        <p className="mt-1 text-sm text-text-muted">
                            Pedile a un administrador que te asigne los permisos de tu puesto.
                        </p>
                    </div>
                )}
            </section>

            {has(PERMISSIONS.VERMIRADOR3D) && <MiradorCard />}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <WorkflowCard />
                {has(PERMISSIONS.USARCHATIA) && <AgriCard />}
            </div>
        </div>
    )
}

interface WelcomeHeroProps {
    nombreCompleto?: string
    rol?: string
}

function WelcomeHero({ nombreCompleto, rol }: WelcomeHeroProps) {
    const ahora = new Date()
    const nombre = nombreCompleto?.trim().split(' ')[0]
    const fecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(ahora)

    return (
        <section className="relative overflow-hidden rounded-[32px] bg-linear-to-br from-brand via-brand/90 to-brand/65 p-7 text-white shadow-clay-card sm:p-10">
            {/* Resplandores decorativos, fuera del flujo. */}
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-300/15 blur-3xl" />
            <Scale
                aria-hidden
                strokeWidth={1.2}
                className="pointer-events-none absolute -bottom-10 -right-6 size-56 text-white/8 rotate-[-12deg] sm:size-72"
            />

            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                <div className="space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ring-inset ring-white/20">
                        <span aria-hidden className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        {fecha}
                    </span>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
                            {greetingFor(ahora.getHours())}
                            {nombre && <>, {nombre}</>}
                        </h1>
                        <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 fill-mode-both">
                            Bienvenido a <span className="font-bold text-white">METRIKA 360</span>. Pesaje, control de
                            calidad y trazabilidad de cada lote, en un solo lugar.
                        </p>
                    </div>
                </div>

                {nombreCompleto && (
                    <div className="flex items-center gap-3 self-start rounded-2xl bg-white/12 p-3 pr-5 ring-1 ring-inset ring-white/20 backdrop-blur-sm md:self-auto animate-in fade-in zoom-in-95 duration-500 delay-200 fill-mode-both">
                        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-base font-black tracking-wide text-brand shadow-clay-btn">
                            {getInitials(nombreCompleto)}
                        </div>
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-bold">{nombreCompleto}</p>
                            {rol && (
                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                                    {rol}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="space-y-0.5">
            <h2 className="text-lg font-extrabold tracking-tight text-text-main">{title}</h2>
            <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
    )
}

function QuickActionCard({ action, index }: { action: QuickAction; index: number }) {
    return (
        <Link
            to={action.to}
            style={{ animationDelay: `${150 + index * 70}ms`, animationDuration: '420ms' }}
            className={
                'group relative flex flex-col gap-4 overflow-hidden rounded-[24px] border border-border-ui/60 bg-surface p-5 ' +
                'shadow-clay-card outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand/30 ' +
                'active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/40 ' +
                'animate-in fade-in slide-in-from-bottom-3 fill-mode-both'
            }
        >
            <div className="flex items-start justify-between">
                <span className={`grid size-11 place-items-center rounded-2xl transition-transform duration-200 ease-out group-hover:scale-110 ${action.accent}`}>
                    {action.icon}
                </span>
                <span className="grid size-8 place-items-center rounded-full bg-muted/60 text-text-muted transition-all duration-200 ease-out group-hover:bg-brand group-hover:text-white">
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:-rotate-45" strokeWidth={2.4} />
                </span>
            </div>

            <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-text-main">{action.title}</h3>
                <p className="text-[13px] leading-relaxed text-text-muted">{action.description}</p>
            </div>
        </Link>
    )
}

/** El recorrido de un bulto por la planta, en tres pasos. */
function WorkflowCard() {
    return (
        <section className="rounded-[28px] border border-border-ui/60 bg-surface p-6 shadow-clay-card sm:p-7">
            <SectionTitle title="Cómo funciona" subtitle="El recorrido de cada bulto en la estación." />

            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {WORKFLOW_STEPS.map((paso, indice) => (
                    <li
                        key={paso.title}
                        style={{ animationDelay: `${300 + indice * 90}ms`, animationDuration: '420ms' }}
                        className="relative rounded-2xl bg-muted/40 p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                    >
                        <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-xl bg-brand/12 text-brand">
                                {paso.icon}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-text-muted/60">
                                Paso {indice + 1}
                            </span>
                        </div>
                        <p className="mt-3 text-sm font-bold text-text-main">{paso.title}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-text-muted">{paso.description}</p>
                    </li>
                ))}
            </ol>
        </section>
    )
}

/** Acceso al Mirador, la planta en vivo en 3D. */
function MiradorCard() {
    return (
        <Link
            to="/mirador"
            className={
                'group relative flex flex-col gap-5 overflow-hidden rounded-[28px] border border-border-ui/60 bg-surface p-6 shadow-clay-card ' +
                'outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand/30 focus-visible:ring-2 focus-visible:ring-brand/40 ' +
                'sm:flex-row sm:items-center sm:p-7 animate-in fade-in slide-in-from-bottom-3 fill-mode-both'
            }
            style={{ animationDelay: '420ms', animationDuration: '420ms' }}
        >
            <span aria-hidden className="pointer-events-none absolute -left-10 -bottom-16 size-48 rounded-full bg-brand/10 blur-3xl" />

            {/* Un tablero isométrico en miniatura: cuatro casillas y una pila de fichas. */}
            <div aria-hidden className="relative grid h-24 w-36 shrink-0 place-items-center">
                <div className="grid rotate-x-[55deg] rotate-z-[-35deg] grid-cols-4 gap-1 rounded-xl bg-brand/12 p-1.5 transition-transform duration-500 group-hover:rotate-z-[-28deg] [transform-style:preserve-3d]">
                    {['bg-success', 'bg-warning', 'bg-brand/50', 'bg-text-muted/40'].map((color, i) => (
                        <span key={i} className="grid size-6 place-items-center rounded-md bg-surface shadow-clay-btn">
                            <span className={`size-3 rounded-full ${color}`} />
                        </span>
                    ))}
                </div>
            </div>

            <div className="relative flex-1 space-y-1.5">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted/70">
                    <span aria-hidden className="size-1.5 rounded-full bg-success animate-pulse" />
                    Planta en vivo · 3D
                </p>
                <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-text-main">
                    <Telescope className="size-5 text-brand" strokeWidth={2.2} />
                    Mirador
                </h3>
                <p className="max-w-xl text-sm leading-relaxed text-text-muted">
                    Toda la planta en un tablero: cada cliente con sus lotes por etapa y cada pesaje como una ficha que aterriza en vivo.
                </p>
            </div>

            <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-clay-btn sm:self-center">
                Abrir Mirador
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.6} />
            </span>
        </Link>
    )
}

function AgriCard() {
    return (
        <Link
            to="/agri"
            className={
                'group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] border border-border-ui/60 ' +
                'bg-surface p-6 shadow-clay-card outline-none transition-all duration-200 ease-out sm:p-7 ' +
                'hover:-translate-y-1 hover:border-agri-to/40 hover:shadow-[0_18px_40px_-20px_var(--agri-to)] ' +
                'focus-visible:ring-2 focus-visible:ring-agri-to/40'
            }
        >
            <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-linear-to-br from-agri-from/20 to-agri-to/20 blur-2xl" />

            <div className="relative flex items-center gap-3">
                <AgriAvatar size="lg" />
                <div className="leading-tight">
                    <p className="text-lg font-extrabold tracking-tight text-text-main">Agri</p>
                    <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted/70">
                        <Sparkles className="size-3" strokeWidth={2.4} aria-hidden />
                        Asistente IA
                    </p>
                </div>
            </div>

            <p className="relative text-sm leading-relaxed text-text-muted">
                Preguntale por lotes, pesajes y calidad en lenguaje natural. Te responde con los datos al día.
            </p>

            <span className="relative inline-flex items-center gap-2 self-start rounded-full bg-linear-to-r from-agri-from to-agri-to px-4 py-2 text-xs font-bold text-white shadow-clay-btn">
                Abrir chat
                <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.6} />
            </span>
        </Link>
    )
}
