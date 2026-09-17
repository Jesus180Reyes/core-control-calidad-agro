import { LogOut, UserRound } from 'lucide-react'

import { SectionCardHeader } from '#/presentation/components/shared/SectionCardHeader'
import { useAuth } from '#/presentation/hooks/auth/useAuth'

export function SessionCard() {
    const { logout } = useAuth()

    return (
        <section className="overflow-hidden rounded-[28px] border border-border-ui bg-surface shadow-clay-card">
            <SectionCardHeader
                title="Sesión"
                description="Cerrar la sesión abierta en este equipo."
                icon={<UserRound className="size-5" strokeWidth={2.1} />}
            />

            <div className="space-y-4 p-5 sm:p-6">
                <p className="text-xs leading-relaxed text-text-muted">
                    Al salir se descartan el token y los permisos guardados en este navegador. Los
                    pesajes ya registrados no se pierden.
                </p>

                <LogoutButton onClick={logout} />
            </div>
        </section>
    )
}

function LogoutButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-600 transition-all duration-200 ease-out hover:bg-rose-500/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-rose-400"
        >
            <LogOut className="size-4.5" strokeWidth={2.2} aria-hidden />
            Cerrar sesión
        </button>
    )
}
