import { Link } from '@tanstack/react-router'
import { Boxes, Receipt, type LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useGetDetalleDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useGetDetalleDocumentoFiscal'
import type { DocumentoFiscalSection } from '#/presentation/types/documentos-fiscales/documento-fiscal-section'

interface SectionTab {
    section: DocumentoFiscalSection
    title: string
    icon: LucideIcon
    /** Cuántos registros trae la sección; se pinta al lado del título. */
    count: number
}

interface DocumentoFiscalSectionTabsProps {
    documentoId: number
    /** La sección abierta; `undefined` mientras no se eligió ninguna. */
    selected?: DocumentoFiscalSection
}

/**
 * El selector de la pantalla de detalle: una pista hundida con una pastilla en
 * relieve sobre la sección abierta. Cada opción es un `Link` a la misma ruta
 * con otro `seccion`: la elección queda en la URL, así que el volver del
 * navegador y un enlace compartido abren la misma sección.
 *
 * Usa la misma query que las tablas de abajo —está cacheada, no hay segundo
 * pedido— y de ahí saca el conteo de cada opción.
 */
export function DocumentoFiscalSectionTabs({
    documentoId,
    selected,
}: DocumentoFiscalSectionTabsProps) {
    const { documento } = useGetDetalleDocumentoFiscal({ documentoId })

    const tabs: SectionTab[] = [
        {
            section: 'impuestos',
            title: 'Impuestos',
            icon: Receipt,
            count: documento.impuestos.length,
        },
        {
            section: 'lotes',
            title: 'Lotes',
            icon: Boxes,
            count: documento.lotes.length,
        },
    ]

    return (
        <nav
            aria-label="Secciones del documento"
            className="inline-flex w-full gap-1 rounded-full bg-bg-app p-1.5 shadow-clay-inset sm:w-auto"
        >
            {tabs.map((tab) => {
                const isSelected = tab.section === selected

                return (
                    <Link
                        key={tab.section}
                        to="/ver-detalles-documento-fiscal"
                        search={{ documentoId, seccion: tab.section }}
                        resetScroll={false}
                        aria-current={isSelected ? 'page' : undefined}
                        className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 sm:flex-none',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                            isSelected
                                ? 'bg-surface text-text-main shadow-clay-btn'
                                : 'text-text-muted hover:text-text-main',
                        )}
                    >
                        <tab.icon
                            aria-hidden
                            className={cn('size-4', isSelected && 'text-brand')}
                        />
                        {tab.title}
                        <span
                            className={cn(
                                'min-w-5 text-xs font-semibold tabular-nums',
                                isSelected ? 'text-brand' : 'text-text-muted/70',
                            )}
                        >
                            {tab.count}
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}
