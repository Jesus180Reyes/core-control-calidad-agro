import { useState } from 'react'
import { DownloadCloud, MoreHorizontal, Trash, type LucideIcon } from 'lucide-react'

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
import { RejectPesajeDialog } from '#/presentation/components/inspeccion-pesajes/RejectPesajeDialog'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'
import { Can } from '../shared/Can'
import { PERMISSIONS, type Permission } from '#/presentation/types/auth/permissions'

interface PesajeRowActionsProps {
    pesaje: PesajeData
}
type ItemActionSelected = 'RECHAZAR_PESAJE' | 'DESCARGAR_COMPROBANTE' | null;

interface ActionsMenuItem {
    /** Identificador de la acción; se usa como key de la lista. */
    action: NonNullable<ItemActionSelected>
    label: string
    icon: LucideIcon
    /** Se ejecuta después de cerrar el menú. */
    run: () => void
    permission?: Permission
}

interface ActionsMenuProps {
    items: readonly ActionsMenuItem[]
    triggerLabel: string
}


export function PesajeRowActions({ pesaje }: PesajeRowActionsProps) {
    const [selected, setSelected] = useState<ItemActionSelected>(null)

    const actions: ActionsMenuItem[] = [
        {
            action: 'DESCARGAR_COMPROBANTE',
            label: 'Descargar comprobante',
            icon: DownloadCloud,
            run: () => console.log('Descargar comprobante', pesaje.id),

        },
        {
            action: 'RECHAZAR_PESAJE',
            label: 'Rechazar Pesaje',
            icon: Trash,
            run: () => setSelected('RECHAZAR_PESAJE'),
            permission: PERMISSIONS.RECHAZARPESAJELOTE,
        },
    ]

    return (
        <>
            <ActionsMenu
                items={actions}
                triggerLabel={`Acciones del pesaje del ${pesaje.id}`}
            />

            <RejectPesajeDialog
                pesaje={pesaje}
                open={selected === 'RECHAZAR_PESAJE'}
                onOpenChange={(open) => !open && setSelected(null)}
            />
        </>
    )
}

function ActionsMenu({ items, triggerLabel }: ActionsMenuProps) {
    const [abierto, setAbierto] = useState(false)

    return (
        <Popover open={abierto} onOpenChange={setAbierto}>
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
                            {items.map(({ action, label, icon: Icon, run, permission }) => (
                                <Can permission={permission}>
                                    <CommandItem
                                        key={action}
                                        onSelect={() => {
                                            setAbierto(false)
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
