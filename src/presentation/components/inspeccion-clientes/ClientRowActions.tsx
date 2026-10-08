import { useState } from 'react'
import { Edit, MoreHorizontal, Package, PackageCheck, Trash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'
import { useNavigate } from '@tanstack/react-router'
import { RejectClienteDialog } from '#/presentation/components/inspeccion-clientes/RejectClienteDialog'
import { PERMISSIONS, type Permission } from '#/presentation/types/auth/permissions'
import { Can } from '../shared/Can'

interface ClientRowActionsProps {
    cliente: Cliente
}
interface RowAction {
    label: string
    icon: LucideIcon
    run: () => void
    permission?: Permission
    /** `destructive` la pinta en rojo. */
    variant?: 'default' | 'destructive'
    /**
     * Abre un bloque nuevo con una línea encima. Va en el item y no aparte para
     * que el `<Can>` que lo esconde se lleve también su línea.
     */
    separatorBefore?: boolean
}

type ItemActionSelected = 'RECHAZAR_CLIENTE' | 'EDITAR_CLIENTE' | 'VER_REPORTE_LOTES' | null;
export function ClientRowActions({ cliente }: ClientRowActionsProps) {
    const [selectedAction, setselectedAction] = useState<ItemActionSelected>(null);
    const [abierto, setAbierto] = useState(false);
    const navigate = useNavigate();

    const actions: RowAction[] = [
        {
            label: 'Editar Cliente',
            icon: Edit,
            run: () => console.log('Ver lotes', cliente.id),
        },
        {
            label: 'Ver lotes pendientes de inspección',
            icon: Package,
            permission: PERMISSIONS.VERCLIENTELOTES,
            run: () =>
                navigate({
                    to: '/inspeccion-lotes-by-cliente',
                    search: { clienteId: cliente.id },
                    state: { cliente },
                }),
        },
        {
            label: 'Ver lotes finalizados por aprobador',
            icon: PackageCheck,
            permission: PERMISSIONS.VERCLIENTELOTES,
            run: () =>
                navigate({
                    to: '/clientes-finalizados',
                    search: { clienteId: cliente.id },
                    state: { cliente },
                }),
        },
        {
            label: 'Rechazar Cliente',
            icon: Trash,
            run: () => setselectedAction('RECHAZAR_CLIENTE'),
            permission: PERMISSIONS.RECHAZARCLIENTE,
            variant: 'destructive',
            separatorBefore: true,

        },
    ]

    return (
        <>
            <RowActionsMenu
                open={abierto}
                onOpenChange={setAbierto}
                triggerLabel={`Acciones de ${cliente.nombre}`}
                actions={actions}
            />

            <RejectClienteDialog
                cliente={cliente}
                open={selectedAction === 'RECHAZAR_CLIENTE'}
                onOpenChange={(open) => !open && setselectedAction(null)}
            />
        </>
    )
}


interface RowActionsMenuProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    triggerLabel: string
    actions: RowAction[]
}

function RowActionsMenu({
    open,
    onOpenChange,
    triggerLabel,
    actions,
}: RowActionsMenuProps) {
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
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
