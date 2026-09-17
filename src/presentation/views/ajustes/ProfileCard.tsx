import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'

import { getInitials } from '#/presentation/components/shared/getInitials'
import { usePermissions } from '#/presentation/hooks/auth/usePermissions'
import type { Usuario } from '#/presentation/types/auth/auth.types'

interface ProfileCardProps {
    usuario: Usuario
}

export function ProfileCard({ usuario }: ProfileCardProps) {
    return (
        <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-brand to-brand/70 p-6 text-white shadow-clay-card sm:p-7">
            <Halo />

            <div className="relative flex items-center gap-5">
                <Avatar nombreCompleto={usuario.complete_name} />

                <div className="min-w-0 space-y-1.5">
                    <h2 className="truncate text-2xl font-black leading-tight tracking-tight sm:text-[28px]">
                        {usuario.complete_name}
                    </h2>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                        {usuario.rol}
                    </p>
                </div>
            </div>

            <ProfileBadges />
        </section>
    )
}

/** Resplandor decorativo; fuera del flujo para no empujar el contenido. */
function Halo() {
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/10 blur-2xl"
        />
    )
}

function Avatar({ nombreCompleto }: { nombreCompleto: string }) {
    return (
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black tracking-wide text-brand shadow-clay-btn sm:size-[72px] sm:text-2xl">
            {getInitials(nombreCompleto)}
        </div>
    )
}

/** El pie de la card: estado de la sesión y cuántos permisos trae. */
function ProfileBadges() {
    const { permissions } = usePermissions()

    return (
        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5">
            <Badge icon={<span aria-hidden className="size-1.5 rounded-full bg-emerald-300" />}>
                Sesión activa
            </Badge>

            <Badge icon={<ShieldCheck className="size-3.5" strokeWidth={2.4} aria-hidden />}>
                {permissions.length} {permissions.length === 1 ? 'permiso' : 'permisos'}
            </Badge>
        </div>
    )
}

function Badge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
            {icon}
            {children}
        </span>
    )
}
