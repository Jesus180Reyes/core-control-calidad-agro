import {
    Ban,
    Download,
    Eye,
    MoreHorizontal,
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

interface DocumentoFiscalRowActionsProps {
    documento: Documento
}

export function DocumentoFiscalRowActions({
    documento,
}: DocumentoFiscalRowActionsProps) {
    const sinArchivo = !documento.archivo_url

    const items: ActionsMenuItem[] = [
        {
            action: 'VER_DETALLES_DOCUMENTO',
            label: 'Ver detalles documento',
            icon: Eye,
            run: () => console.log('Ver detalles', documento.id),
        },
        {
            action: 'DESCARGAR_DOCUMENTO',
            label: 'Descargar',
            icon: Download,
            disabled: sinArchivo,
            hint: sinArchivo ? 'Sin archivo' : undefined,
            run: () => {
                if (!documento.archivo_url) return

                window.open(documento.archivo_url, '_blank', 'noopener,noreferrer')
            },
        },
        {
            action: 'ANULAR_DOCUMENTO',
            label: 'Anular documento',
            icon: Ban,
            variant: 'destructive',
            run: () => console.log('Anular documento', documento.id),
        },
    ]

    return (
        <ActionsMenu
            items={items}
            triggerLabel={`Acciones del documento ${documento.numero_completo}`}
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
                        className="text-text-muted transition-colors hover:text-text-main data-popup-open:bg-muted data-popup-open:text-text-main"
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
