import { ArrowLeft } from 'lucide-react'
import { useRouter, type LinkProps } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface BackButtonProps {
    /** Destino cuando no hay historial para volver (entrada directa por URL). */
    fallbackTo: LinkProps['to']
    label?: string
    className?: string
}

export function BackButton({
    fallbackTo,
    label = 'Volver',
    className,
}: BackButtonProps) {
    const router = useRouter()

    const volver = () => {
        if (router.history.canGoBack()) {
            router.history.back()
            return
        }

        router.navigate({ to: fallbackTo })
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            onClick={volver}
            className={cn('rounded-full shrink-0', className)}
        >
            <ArrowLeft />
        </Button>
    )
}
