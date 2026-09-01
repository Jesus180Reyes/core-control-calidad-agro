import type { ReactNode } from 'react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '#/lib/utils'

type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

interface CustomDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    /** Ancho máximo del popup. Por defecto `md`. */
    size?: DialogSize
    /** Acciones del pie; si no se pasa, no se pinta el pie. */
    footer?: ReactNode
    showCloseButton?: boolean
    className?: string
    children: ReactNode
}

const sizeStyles: Record<DialogSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
}

/**
 * Diálogo base del proyecto: envuelve la primitiva de shadcn con los tokens
 * propios (`bg-surface`, `border-border-ui`, `shadow-clay-card`) y deja el
 * cuerpo libre para el contenido de cada pantalla.
 */
export function CustomDialog({
    open,
    onOpenChange,
    title,
    description,
    size = 'md',
    footer,
    showCloseButton = true,
    className,
    children,
}: CustomDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={showCloseButton}
                className={cn(
                    'rounded-3xl border border-border-ui bg-surface p-6 shadow-clay-card outline-none',
                    sizeStyles[size],
                    className,
                )}
            >
                <DialogHeader>
                    <DialogTitle className="text-lg font-black text-text-main">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-sm text-text-muted">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {/* El padding compensado evita que el scroll recorte el ring de foco de los inputs. */}
                <div className="-mx-1 max-h-[70vh] overflow-y-auto px-1">
                    {children}
                </div>

                {footer && (
                    <DialogFooter className="rounded-b-3xl border-border-ui bg-bg-app">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
