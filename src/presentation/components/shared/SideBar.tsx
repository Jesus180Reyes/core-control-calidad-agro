import { Link } from '@tanstack/react-router'

interface NavItem {
    label: string
    to: string
    icon: React.ReactNode
}

export function Sidebar() {
    // 💡 Rutas alineadas a la nueva arquitectura y estructura plana del enrutador
    const menuItems: NavItem[] = [
        {
            label: 'Dashboard',
            to: '/',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
        },
        {
            label: 'Control de Calidad',
            to: '/control-calidad',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            label: 'Historial',
            to: '/historial',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: 'Parámetros',
            to: '/parametros',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0" />
                </svg>
            ),
        },
    ]

    return (
        <aside className="w-72 h-[calc(100vh-2rem)] my-4 ml-4 bg-surface border border-border-ui/50 rounded-[28px] p-5 shadow-clay-card flex flex-col justify-between transition-colors duration-300">

            <div className="space-y-6">
                <div className="flex items-center gap-3.5 px-3 py-2">
                    <div className="w-11 h-11 bg-indigo-600 dark:bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-clay-btn">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17M19 9l-7-6-7 6M5 19h14" />
                        </svg>
                    </div>
                    <div className="leading-tight">
                        <h1 className="text-lg font-black tracking-tight text-text-main">
                            Bascula
                        </h1>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-text-muted/70">
                            Quality Inspector
                        </p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            activeProps={{
                                className: 'bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border-r-[3.5px] border-indigo-600 dark:border-indigo-500 shadow-sm',
                            }}
                            inactiveProps={{
                                className: 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-text-main',
                            }}
                            className="group flex items-center gap-4 px-4.5 py-3 rounded-xl transition-all duration-200 text-sm font-semibold cursor-pointer"
                        >
                            <span className="shrink-0 transition-colors duration-200">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="space-y-5">
                <div className="pt-4 border-t border-border-ui/30 space-y-1">
                    <Link
                        to="/control-calidad"
                        inactiveProps={{
                            className: 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:text-text-main',
                        }}
                        className="group flex items-center gap-4.5 px-4.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold cursor-pointer"
                    >
                        <span className="shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </span>
                        <span>Ajustes</span>
                    </Link>

                    <button
                        onClick={() => {
                            localStorage.removeItem('auth_token')
                            window.location.reload()
                        }}
                        className="w-full group flex items-center gap-4.5 px-4.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 cursor-pointer text-left"
                    >
                        <span className="shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>

        </aside>
    )
}