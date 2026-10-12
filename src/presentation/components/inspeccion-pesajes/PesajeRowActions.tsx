import { useState } from 'react'
import { DownloadCloud, MoreHorizontal, Trash, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RejectPesajeDialog } from '#/presentation/components/inspeccion-pesajes/RejectPesajeDialog'
import { useDownloadEtiqueta } from '#/presentation/hooks/pesajes/useDownloadEtiqueta'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'
import { Can } from '../shared/Can'
import { cn } from '#/lib/utils'
import { PERMISSIONS, type Permission } from '#/presentation/types/auth/permissions'

interface PesajeRowActionsProps {
    pesaje: PesajeData
}
type ItemActionSelected = 'RECHAZAR_PESAJE' | 'DESCARGAR_ETIQUETA' | null;

interface ActionsMenuItem {
    /** Identificador de la acción; se usa como key de la lista. */
    action: NonNullable<ItemActionSelected>
    label: string
    icon: LucideIcon
    /** Se ejecuta después de cerrar el menú. */
    run: () => void
    permission?: Permission
    /** Evita disparar de nuevo una acción que ya está en curso. */
    disabled?: boolean
    /** Se suma a las clases del item; pisa las de por defecto (p. ej. el color). */
    className?: string
    /** Lo mismo para el ícono, que trae su propio color y no hereda el del item. */
    iconClassName?: string
}

interface ActionsMenuProps {
    items: readonly ActionsMenuItem[]
    triggerLabel: string
}


export function PesajeRowActions({ pesaje }: PesajeRowActionsProps) {
    const [selected, setSelected] = useState<ItemActionSelected>(null)
    const { descargarEtiqueta, generando } = useDownloadEtiqueta()

    const actions: ActionsMenuItem[] = [
        {
            action: 'DESCARGAR_ETIQUETA',
            label: generando ? 'Descargando etiqueta…' : 'Descargar etiqueta',
            icon: DownloadCloud,
            run: () => void descargarEtiqueta(pesaje),
            disabled: generando,
        },
        {
            action: 'RECHAZAR_PESAJE',
            label: 'Rechazar Pesaje',
            className: 'text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20',
            iconClassName: 'text-destructive',
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
        <DropdownMenu open={abierto} onOpenChange={setAbierto}>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        // 44 px en el teléfono: es el mínimo cómodo para un dedo.
                        className="size-11 md:size-8 text-text-muted transition-colors hover:text-text-main data-popup-open:bg-muted data-popup-open:text-text-main"
                        aria-label={triggerLabel}
                    />
                }
            >
                <MoreHorizontal />
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="w-auto min-w-48 rounded-xl border border-border-ui p-1.5 shadow-lg ring-0 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-closed:duration-100 data-closed:ease-in"
            >
                {items.map(({ action, label, icon: Icon, run, permission, disabled, className, iconClassName }) => (
                    <Can key={action} permission={permission}>
                        <DropdownMenuItem
                            disabled={disabled}
                            className={cn('gap-2.5 rounded-lg px-2 py-2 font-medium', className)}
                            onClick={() => {
                                setAbierto(false)
                                run()
                            }}
                        >
                            <Icon className={cn('text-text-muted transition-colors', iconClassName)} />
                            {label}
                        </DropdownMenuItem>
                    </Can>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
