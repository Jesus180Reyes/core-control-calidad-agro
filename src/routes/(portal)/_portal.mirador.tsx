import { createFileRoute } from '@tanstack/react-router'

import { usePlantTwin } from '#/presentation/hooks/mirador/usePlantTwin'
import { PlantTwinView } from '#/presentation/views/mirador/PlantTwinView'

export const Route = createFileRoute('/(portal)/_portal/mirador')({
    ssr: false,
    component: RouteComponent,
})

function RouteComponent() {
    const twin = usePlantTwin()

    // El tablero ocupa justo la pantalla, igual que `/agri`: se descuenta el
    // padding de `<main>` y, en el teléfono, el header de `MobileNav`.
    return (
        <div className="h-[calc(100dvh-2rem-var(--mobile-nav-h))] md:h-[calc(100vh-4rem)]">
            <PlantTwinView twin={twin} />
        </div>
    )
}
