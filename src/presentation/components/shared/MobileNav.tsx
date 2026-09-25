import { Menu, Scale } from 'lucide-react'
import { useState } from 'react'

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { SidebarContent } from './SideBar'

/**
 * Header del teléfono: por debajo de `md:` reemplaza al `<aside>` del Sidebar,
 * que no entra en 375 px. El menú abre el mismo `SidebarContent` en un drawer.
 */
export function MobileNav() {
    const [open, setOpen] = useState(false)

    return (
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border-ui/60 bg-surface/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                    aria-label="Abrir menú"
                    className="grid size-11 shrink-0 place-items-center rounded-2xl text-text-main outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                    <Menu className="size-5" strokeWidth={2.2} />
                </SheetTrigger>

                <SheetContent
                    side="left"
                    className="justify-between overflow-y-auto border-border-ui/60 bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-text-main data-[side=left]:w-72 data-[side=left]:max-w-[85vw]"
                >
                    <SheetTitle className="sr-only">Menú</SheetTitle>
                    <SidebarContent onNavigate={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-xl bg-linear-to-br from-brand to-brand/70 text-white shadow-clay-btn">
                    <Scale className="size-4" strokeWidth={2.2} />
                </div>
                <span className="text-[15px] font-extrabold tracking-tight text-text-main">Bascula</span>
            </div>
        </header>
    )
}
