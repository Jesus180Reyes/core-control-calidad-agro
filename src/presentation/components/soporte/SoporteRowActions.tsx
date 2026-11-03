import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
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
import type { Permission } from '#/presentation/types/auth/permissions'
import type { CatalogoData } from '#/presentation/types/catalogos/catalogo_response'

interface SoporteRowActionsProps {
    user: CatalogoData
}

interface RowAction {
    label: string
    icon: LucideIcon
    run: () => void
    permission?: Permission
    /** `destructive` la pinta en rojo. */
    variant?: 'default' | 'destructive'
    /** Abre un bloque nuevo con una línea encima. */
    separatorBefore?: boolean
}

/** Menú de fila de la tabla de usuarios de `/soporte`. Por ahora, sin acciones. */
export function SoporteRowActions({ user }: SoporteRowActionsProps) {
    const [open, setOpen] = useState(false)

    const actions: RowAction[] = []

    return (
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
                {actions.map(({ label, icon: Icon, run, permission, variant, separatorBefore }) => (
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
    )
}
