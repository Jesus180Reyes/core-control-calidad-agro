import { Link, useLocation } from '@tanstack/react-router'
import { ClipboardCheck, History, LogOut, Scale, SlidersHorizontal, Users } from 'lucide-react'

import { Can } from '#/presentation/components/shared/Can'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { usePermissions } from '#/presentation/hooks/auth/usePermissions'
import { PERMISSIONS, type Permission } from '#/presentation/types/auth/permissions'

interface NavItem {
    label: string
    to: string
    icon: React.ReactNode
    rutasActivas?: string[]
    permission?: Permission
}

const CLASES_ITEM = 'group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer outline-none transition-all duration-200 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/40'

const CLASES_ACTIVO = 'bg-brand/10 text-brand'

const CLASES_INACTIVO = 'text-text-muted hover:bg-muted/70 hover:text-text-main hover:translate-x-0.5'

const CLASES_MARCA_ACTIVA = 'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_10px_-1px_var(--brand)] animate-in fade-in zoom-in-50 duration-300'

const CLASES_CHIP = 'shrink-0 grid place-items-center size-8 rounded-xl transition-all duration-200 ease-out group-hover:scale-110'

const CLASES_ITEM_PIE = 'group flex w-full items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer outline-none text-left transition-all duration-200 ease-out active:scale-[0.98] focus-visible:ring-2'

const CLASES_ENTRADA = 'animate-in fade-in slide-in-from-left-3 fill-mode-both'

function inicialesDe(nombreCompleto: string): string {
    const palabras = nombreCompleto.trim().split(/\s+/)
    const primera = palabras[0]?.[0] ?? ''
    const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : ''
    return `${primera}${ultima}`.toUpperCase()
}

export function Sidebar() {
    const { usuario, logout } = useAuth()
    const { has } = usePermissions()
    const { pathname } = useLocation()
    const menuItems: NavItem[] = [
        // {
        //     label: 'Dashboard',
        //     to: '/',
        //     icon: <LayoutDashboard className="size-[18px]" strokeWidth={2.1} />,
        // },
        {

            label: 'Control de Calidad',
            to: '/clientes',
            rutasActivas: ['/control-calidad'],
            permission: PERMISSIONS.MODULOCONTROLCALIDAD,
            icon: <ClipboardCheck className="size-4.5" strokeWidth={2.1} />,
        },
        {
            label: 'Historial',
            to: '/historial',
            icon: <History className="size-4.5" strokeWidth={2.1} />,
        },

        {
            label: 'Clientes',
            to: '/inspeccion-clientes',
            permission: PERMISSIONS.MODULOCLIENTES,
            icon: <Users className="size-4.5" strokeWidth={2.1} />,
        },
    ]

    return (
        <aside className="w-72 h-[calc(100vh-2rem)] my-4 ml-4 bg-surface border border-border-ui/60 rounded-[28px] p-4 shadow-clay-card flex flex-col justify-between transition-colors animate-in fade-in slide-in-from-left-6 duration-500 ease-out">

            <div className="space-y-7">
                <div className="flex items-center gap-3.5 px-2.5 pt-2">
                    <div className="relative w-11 h-11 rounded-2xl bg-linear-to-br from-brand to-brand/70 flex items-center justify-center text-white shadow-clay-btn ring-1 ring-inset ring-white/20 transition-transform duration-300 ease-out hover:scale-105 hover:rotate-6">
                        <Scale className="size-5.5" strokeWidth={2.2} />
                    </div>
                    <div className="leading-tight">
                        <h1 className="text-[17px] font-extrabold tracking-tight text-text-main">
                            Bascula
                        </h1>
                        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-text-muted/70">
                            Quality Inspector
                        </p>
                    </div>
                </div>

                <nav className="space-y-1.5">
                    <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted/50">
                        Operación
                    </p>

                    {menuItems.map((item, indice) => {

                        if (item.permission !== undefined && !has(item.permission)) return null

                        const activo = pathname === item.to || (item.rutasActivas?.includes(pathname) ?? false)

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                aria-current={activo ? 'page' : undefined}
                                style={{ animationDelay: `${indice * 70}ms`, animationDuration: '400ms' }}
                                className={`${CLASES_ITEM} ${CLASES_ENTRADA} ${activo ? CLASES_ACTIVO : CLASES_INACTIVO}`}
                            >
                                {activo && <span className={CLASES_MARCA_ACTIVA} aria-hidden />}
                                <span
                                    className={`${CLASES_CHIP} ${activo
                                        ? 'bg-brand/15 text-brand'
                                        : 'bg-muted/60 text-text-muted group-hover:text-text-main'
                                        }`}
                                >
                                    {item.icon}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200 fill-mode-both">
                {usuario && (
                    <div className="group flex items-center gap-3 rounded-2xl bg-muted/50 border border-border-ui/60 p-2.5 transition-colors duration-200 hover:bg-muted/80">
                        <div className="size-9 shrink-0 rounded-xl bg-brand/12 text-brand flex items-center justify-center text-[11px] font-black tracking-wide transition-transform duration-200 ease-out group-hover:scale-105">
                            {inicialesDe(usuario.complete_name)}
                        </div>
                        <div className="leading-tight overflow-hidden">
                            <p className="text-text-main text-sm font-bold truncate">
                                {usuario.complete_name}
                            </p>
                            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.14em] truncate">
                                {usuario.rol}
                            </p>
                        </div>
                    </div>
                )}

                <div className="pt-3 border-t border-border-ui/60 space-y-1">
                    <Can permission={PERMISSIONS.MODULOCONTROLCALIDAD}>
                        <Link
                            to="/"
                            inactiveProps={{
                                className: 'text-text-muted hover:bg-muted/70 hover:text-text-main',
                            }}
                            className={`${CLASES_ITEM_PIE} focus-visible:ring-brand/40`}
                        >
                            <span className={`${CLASES_CHIP} bg-muted/60 group-hover:rotate-45`}>
                                <SlidersHorizontal className="size-4.5" strokeWidth={2.1} />
                            </span>
                            <span>Ajustes</span>
                        </Link>
                    </Can>

                    <button
                        onClick={logout}
                        className={`${CLASES_ITEM_PIE} text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus-visible:ring-rose-500/40`}
                    >
                        <span className={`${CLASES_CHIP} bg-rose-500/10`}>
                            <LogOut className="size-4.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" strokeWidth={2.1} />
                        </span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>

        </aside>
    )
}
