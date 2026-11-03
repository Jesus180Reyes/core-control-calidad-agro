import { useState } from 'react'
import { KeyRound, MoreHorizontal, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '#/presentation/components/shared/Can'
import { AssignSupervisorPinDialog } from '#/presentation/components/soporte/AssignSupervisorPinDialog'
import { ResetUserPasswordDialog } from '#/presentation/components/soporte/ResetUserPasswordDialog'
import type { Permission } from '#/presentation/types/auth/permissions'
import type { CatalogUser } from '#/presentation/types/catalogos/catalogo_response'

interface SoporteRowActionsProps {
    user: CatalogUser
}

interface RowAction {
    label: string
    icon: LucideIcon
    run: () => void
    permission?: Permission
    /** `false` la saca del menú, por ejemplo según el `rol` del usuario de la fila. Por defecto, visible. */
    isVisible?: boolean
    /** `destructive` la pinta en rojo. */
    variant?: 'default' | 'destructive'
    /** Abre un bloque nuevo con una línea encima. */
    separatorBefore?: boolean
}

type SelectedAction = 'RESETEAR_PASSWORD' | 'ASIGNAR_PIN' | null


/**
 * Menú de fila de la tabla de usuarios de `/soporte`.
 *
 * Los dos endpoints exigen el **rol** `ADMIN` o `SOPORTE`, no un permiso:
 * alguien con `MODULO-SOPORTE` y otro rol entra a la pantalla pero recibiría
 * 403, así que a él no se le muestra ninguna acción. Es comodidad: el que
 * rechaza es el backend.
 */
export function SoporteRowActions({ user }: SoporteRowActionsProps) {
    const [open, setOpen] = useState(false)
    const [selectedAction, setSelectedAction] = useState<SelectedAction>(null)

    const actions: RowAction[] = [
        {
            label: 'Restablecer contraseña',
            icon: KeyRound,
            run: () => setSelectedAction('RESETEAR_PASSWORD'),
            isVisible: true,
        },
        {
            label: 'Asignar PIN',
            icon: ShieldCheck,
            run: () => setSelectedAction('ASIGNAR_PIN'),
            isVisible: user.rol === 'SUPERVISOR',
        },
    ]
    const visibleActions = actions.filter((action) => action.isVisible !== false)

    // Sin acciones no se pinta el botón: un menú que se abre vacío parece roto.
    if (visibleActions.length === 0) return null

    const closeDialog = (next: boolean) => !next && setSelectedAction(null)

    return (
        <>
            <ResetUserPasswordDialog
                user={user}
                open={selectedAction === 'RESETEAR_PASSWORD'}
                onOpenChange={closeDialog}
            />
            <AssignSupervisorPinDialog
                user={user}
                open={selectedAction === 'ASIGNAR_PIN'}
                onOpenChange={closeDialog}
            />
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Acciones de ${user.nombre}`}
                            // 44 px en el teléfono: es el mínimo cómodo para un dedo.
                            className="size-11 md:size-7 text-text-muted transition-colors hover:text-text-main data-popup-open:bg-muted data-popup-open:text-text-main"
                        />
                    }
                >
                    <MoreHorizontal />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-auto min-w-48 rounded-xl border border-border-ui p-1.5 shadow-lg ring-0 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-closed:duration-100 data-closed:ease-in"
                >
                    {visibleActions.map(({ label, icon: Icon, run, permission, variant, separatorBefore }) => (
                        <Can key={label} permission={permission}>
                            {separatorBefore && (
                                <DropdownMenuSeparator className="-mx-1.5 bg-border-ui first:hidden" />
                            )}

                            <DropdownMenuItem
                                variant={variant}
                                className="gap-2.5 rounded-lg px-2 py-2 font-medium"
                                onClick={run}
                            >
                                <Icon className="text-text-muted transition-colors" />
                                {label}
                            </DropdownMenuItem>
                        </Can>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
