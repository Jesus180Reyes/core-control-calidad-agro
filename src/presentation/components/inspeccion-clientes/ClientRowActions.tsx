import { useState } from 'react'
import { Edit, MoreHorizontal, Package, DownloadCloud, Trash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
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
            label: 'Ver lotes registrados',
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
            label: 'Ver Reporte de Lotes',
            icon: DownloadCloud,
            run: () => setselectedAction('VER_REPORTE_LOTES'),
        },
        {
            label: 'Rechazar Cliente',
            icon: Trash,
            run: () => setselectedAction('RECHAZAR_CLIENTE'),
            permission: PERMISSIONS.RECHAZARCLIENTE,

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
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={triggerLabel}
                    />
                }
            >
                <MoreHorizontal />
            </PopoverTrigger>

            <PopoverContent
                align="start"
                className="w-56 gap-0 p-0 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-open:blur-in-2 data-closed:duration-100 data-closed:ease-in"
            >
                <Command>
                    <CommandInput placeholder="Buscar acción..." />

                    <CommandList>
                        <CommandEmpty className="text-text-muted">
                            Sin acciones.
                        </CommandEmpty>

                        <CommandGroup>
                            {actions.map(({ label, icon: Icon, run, permission }) => (
                                <Can permission={permission}>
                                    <CommandItem
                                        key={label}
                                        onSelect={() => {
                                            onOpenChange(false)
                                            run()
                                        }}
                                    >
                                        <Icon />
                                        {label}
                                    </CommandItem>
                                </Can>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
