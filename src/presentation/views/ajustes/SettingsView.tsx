import type { Usuario } from '#/presentation/types/auth/auth.types'
import { useAuth } from '#/presentation/hooks/auth/useAuth'
import { AppearanceCard } from '#/presentation/views/ajustes/AppearanceCard'
import { ProfileCard } from '#/presentation/views/ajustes/ProfileCard'
import { SessionCard } from '#/presentation/views/ajustes/SessionCard'

/**
 * La pantalla de ajustes en desktop: la misma info que en móvil —perfil arriba,
 * apariencia debajo— repartida en dos columnas, con el perfil y la sesión
 * fijos a la izquierda mientras se elige el modo a la derecha.
 */
export function SettingsView() {
    const { usuario } = useAuth()

    return (
        <div className="mx-auto w-full max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <SettingsHeader />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <IdentityColumn usuario={usuario} />
                <AppearanceCard />
            </div>
        </div>
    )
}

function SettingsHeader() {
    return (
        <header className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                Preferencias
            </span>

            <h1 className="text-[26px] font-black leading-tight tracking-tight text-text-main sm:text-3xl">
                Ajustes
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-text-muted">
                Tu perfil y cómo se ve la app en esta estación de pesaje.
            </p>
        </header>
    )
}

/** La columna que acompaña: quién entró y cómo salir. Queda fija al hacer scroll. */
function IdentityColumn({ usuario }: { usuario: Usuario | null }) {
    return (
        <div className="space-y-6 lg:sticky lg:top-8">
            {usuario && <ProfileCard usuario={usuario} />}
            <SessionCard />
        </div>
    )
}
