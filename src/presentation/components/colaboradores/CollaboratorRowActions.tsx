import {
    Edit,
    KeyRound,
    MoreHorizontal,
    UserX,
    type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Can } from '#/presentation/components/shared/Can'
import type { Permission } from '#/presentation/types/auth/permissions'
import type { CatalogoData } from '#/presentation/types/catalogos/catalogo_response'

type ItemActionSelected = 'EDITAR_COLABORADOR' | 'RENOVAR_CONTRASEÑA' | 'DESACTIVAR_COLABORADOR'

interface ActionsMenuItem {
    /** Identificador de la acción; se usa como key de la lista. */
    action: ItemActionSelected
    label: string
    icon: LucideIcon
    /** Se ejecuta después de cerrar el menú. */
    run: () => void
    permission?: Permission
    /** Gris y sin click, para una acción que este colaborador no admite. */
    disabled?: boolean
    /** Texto tenue a la derecha; sirve para explicar un `disabled`. */
    hint?: string
    /** `destructive` la pinta en rojo. */
    variant?: 'default' | 'destructive'
    /**
     * Abre un bloque nuevo con una línea encima. Va en el item y no aparte para
     * que el `<Can>` que lo esconde se lleve también su línea.
     */
    separatorBefore?: boolean
}

interface ActionsMenuProps {
    items: readonly ActionsMenuItem[]
    triggerLabel: string
}

interface CollaboratorRowActionsProps {
    usuario: CatalogoData
}

export function CollaboratorRowActions({ usuario }: CollaboratorRowActionsProps) {
    // Todavía no hay endpoints de usuarios: las acciones quedan sin conectar.
    const items: ActionsMenuItem[] = [
        {
            action: 'EDITAR_COLABORADOR',
            label: 'Editar colaborador',
            icon: Edit,
            run: () => console.log('Editar colaborador', usuario.id),
        },
        {
            action: 'RENOVAR_CONTRASEÑA',
            label: 'Renovar contraseña',
            icon: KeyRound,
            run: () => console.log('Renovar contraseña', usuario.id),
        },
        {
            action: 'DESACTIVAR_COLABORADOR',
            label: 'Desactivar colaborador',
            icon: UserX,
            variant: 'destructive',
            separatorBefore: true,
            run: () => console.log('Desactivar colaborador', usuario.id),
        },
    ]

    return (
        <ActionsMenu
            items={items}
            triggerLabel={`Acciones de ${usuario.nombre}`}
        />
    )
}

function ActionsMenu({ items, triggerLabel }: ActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={triggerLabel}
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
                {items.map((item) => (
                    <Can key={item.action} permission={item.permission}>
                        {item.separatorBefore && (
                            <DropdownMenuSeparator className="-mx-1.5 bg-border-ui first:hidden" />
                        )}

                        <DropdownMenuItem
                            variant={item.variant}
                            disabled={item.disabled}
                            className="gap-2.5 rounded-lg px-2 py-2 font-medium"
                            onClick={item.run}
                        >
                            <item.icon className="text-text-muted transition-colors" />
                            {item.label}
                            {item.hint && (
                                <DropdownMenuShortcut className="tracking-normal">
                                    {item.hint}
                                </DropdownMenuShortcut>
                            )}
                        </DropdownMenuItem>
                    </Can>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
