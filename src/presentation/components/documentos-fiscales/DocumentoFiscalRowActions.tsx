import { useState } from 'react'
import {
    DownloadCloud,
    Edit,
    Eye,
    FileX2,
    MoreHorizontal,
    Trash,
    type LucideIcon,
} from 'lucide-react'

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
import { Can } from '#/presentation/components/shared/Can'
import type { Permission } from '#/presentation/types/auth/permissions'
import type { Documento } from '#/presentation/types/documentos-fiscales/documentos-fiscales-response'

type ItemActionSelected = 'DESCARGAR_DOCUMENTO' | 'EDITAR_DOCUMENTO' | 'ANULAR_DOCUMENTO' | 'VER_DETALLES_DOCUMENTO' | null

interface ActionsMenuItem {
    /** Identificador de la acción; se usa como key de la lista. */
    action: NonNullable<ItemActionSelected>
    label: string
    icon: LucideIcon
    /** Se ejecuta después de cerrar el menú. */
    run: () => void
    permission?: Permission
    /** Gris y sin click, para una acción que este documento no admite. */
    disabled?: boolean
}

interface ActionsMenuProps {
    items: readonly ActionsMenuItem[]
    triggerLabel: string
}

interface DocumentoFiscalRowActionsProps {
    documento: Documento
}

export function DocumentoFiscalRowActions({
    documento,
}: DocumentoFiscalRowActionsProps) {
    const actions: ActionsMenuItem[] = [
        {
            action: 'DESCARGAR_DOCUMENTO',
            label: 'Descargar documento',
            icon: DownloadCloud,
            disabled: !documento.archivo_url,
            run: () => {
                if (!documento.archivo_url) return

                window.open(documento.archivo_url, '_blank', 'noopener,noreferrer')
            },
        },
        {
            action: 'VER_DETALLES_DOCUMENTO',
            label: 'Ver detalles del documento fiscal',
            icon: Eye,
            run: () => console.log('Editar documento', documento.id),
        },
        {
            action: 'EDITAR_DOCUMENTO',
            label: 'Editar documento',
            icon: Edit,
            run: () => console.log('Editar documento', documento.id),
        },
        {
            action: 'ANULAR_DOCUMENTO',
            label: 'Anular documento fiscal',
            icon: Trash,
            run: () => console.log('Anular documento', documento.id),
        },
    ]

    return (
        <ActionsMenu
            items={actions}
            triggerLabel={`Acciones del documento ${documento.numero_completo}`}
        />
    )
}

function ActionsMenu({ items, triggerLabel }: ActionsMenuProps) {
    const [abierto, setAbierto] = useState(false)

    return (
        <Popover open={abierto} onOpenChange={setAbierto}>
            <PopoverTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label={triggerLabel} />
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
                            {items.map(
                                ({ action, label, icon: Icon, run, permission, disabled }) => (
                                    <Can key={action} permission={permission}>
                                        <CommandItem
                                            disabled={disabled}
                                            onSelect={() => {
                                                setAbierto(false)
                                                run()
                                            }}
                                        >
                                            <Icon />
                                            {label}
                                        </CommandItem>
                                    </Can>
                                ),
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
