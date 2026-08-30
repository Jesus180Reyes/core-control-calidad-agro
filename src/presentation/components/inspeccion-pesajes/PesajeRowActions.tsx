import { useState } from 'react'
import { DownloadCloud, MoreHorizontal, Trash } from 'lucide-react'

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
import { formatDate } from '#/presentation/helpers/date/formatDate'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

interface PesajeRowActionsProps {
    pesaje: PesajeData
}

export function PesajeRowActions({ pesaje }: PesajeRowActionsProps) {
    const [abierto, setAbierto] = useState(false)

    const actions = [
        {
            label: 'Descargar comprobante',
            icon: DownloadCloud,
            run: () => console.log('Descargar comprobante', pesaje.id),
        },
        {
            label: 'Rechazar Pesaje',
            icon: Trash,
            run: () => console.log('Rechazar Pesaje', pesaje.id),
        },
    ]

    return (
        <Popover open={abierto} onOpenChange={setAbierto}>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones del pesaje del ${formatDate(pesaje.created_at)}`}
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
                            {actions.map(({ label, icon: Icon, run }) => (
                                <CommandItem
                                    key={label}
                                    onSelect={() => {
                                        setAbierto(false)
                                        run()
                                    }}
                                >
                                    <Icon />
                                    {label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
