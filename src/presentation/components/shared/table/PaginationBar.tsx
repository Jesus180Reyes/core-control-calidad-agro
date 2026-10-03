import { ChevronLeft, ChevronRight } from 'lucide-react'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import type { Paginacion } from '#/presentation/types/shared/paginacion.types'

interface PaginationBarProps {
    paginacion: Paginacion
    /** Sustantivo del total, en singular y plural: `{ one: 'cliente', other: 'clientes' }`. */
    itemLabel: { one: string; other: string }
    onPageChange: (pagina: number) => void
    /** Mientras la página nueva carga, los dos botones quedan deshabilitados. */
    isPending?: boolean
}

export function PaginationBar({ paginacion, itemLabel, onPageChange, isPending = false }: PaginationBarProps) {
    const { pagina, total_paginas, total } = paginacion

    // Sin filas, el estado vacío del DataTable ya lo dice.
    if (total === 0) return null

    return (
        <nav
            aria-label="Paginación"
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
        >
            <p className="text-xs text-text-muted lg:text-sm">
                Página {pagina} de {total_paginas} · {total} {total === 1 ? itemLabel.one : itemLabel.other}
            </p>

            <div className="flex gap-3">
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    disabled={pagina <= 1 || isPending}
                    onClick={() => onPageChange(pagina - 1)}
                    icon={<ChevronLeft className="size-4" />}
                >
                    Anterior
                </CustomButton>
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    disabled={pagina >= total_paginas || isPending}
                    onClick={() => onPageChange(pagina + 1)}
                >
                    <span className="flex items-center gap-3">
                        Siguiente
                        <ChevronRight className="size-4 shrink-0" />
                    </span>
                </CustomButton>
            </div>
        </nav>
    )
}
