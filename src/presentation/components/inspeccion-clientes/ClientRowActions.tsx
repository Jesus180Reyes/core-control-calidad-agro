import { useState } from 'react'
import { Edit, MoreHorizontal, Package, DownloadCloud } from 'lucide-react'

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

interface ClientRowActionsProps {
    cliente: Cliente
}


export function ClientRowActions({ cliente }: ClientRowActionsProps) {
    const [abierto, setAbierto] = useState(false);

    const actions = [
        {
            label: 'Editar Cliente',
            icon: Edit,
            run: () => console.log('Ver lotes', cliente.id),
        },
        {
            label: 'Ver lotes registrados',
            icon: Package,
            run: () => console.log('Ver lotes', cliente.id),
        },
        {
            label: 'Ver Reporte de Lotes',
            icon: DownloadCloud,
            run: () => console.log('Ver lotes', cliente.id),
        },
    ]

    return (
        <Popover open={abierto} onOpenChange={setAbierto}>
            <PopoverTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Acciones de ${cliente.nombre}`}
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
