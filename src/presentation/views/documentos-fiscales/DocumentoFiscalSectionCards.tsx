import { Link } from '@tanstack/react-router'
import { Boxes, Receipt, type LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useGetDetalleDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useGetDetalleDocumentoFiscal'
import type { DocumentoFiscalSection } from '#/presentation/types/documentos-fiscales/documento-fiscal-section'

interface SectionCard {
    section: DocumentoFiscalSection
    title: string
    description: string
    icon: LucideIcon
    /** Cuántos registros trae la sección; se pinta en el chip. */
    count: number
    /** Las dos formas del chip: "1 lote" / "12 lotes". */
    singular: string
    plural: string
}

interface DocumentoFiscalSectionCardsProps {
    documentoId: number
    /** La sección abierta; `undefined` mientras no se eligió ninguna. */
    selected?: DocumentoFiscalSection
}

/**
 * El selector de la pantalla de detalle. Cada card es un `Link` a la misma
 * ruta con otro `seccion`: la elección queda en la URL, así que el volver del
 * navegador y un enlace compartido abren la misma sección.
 *
 * Usa la misma query que las tablas de abajo —está cacheada, no hay segundo
 * pedido— y de ahí saca el conteo de cada card.
 */
export function DocumentoFiscalSectionCards({
    documentoId,
    selected,
}: DocumentoFiscalSectionCardsProps) {
    const { documento } = useGetDetalleDocumentoFiscal({ documentoId })

    const cards: SectionCard[] = [
        {
            section: 'impuestos',
            title: 'Impuestos',
            description:
                'Las tarifas aplicadas al documento, con su base gravada y el impuesto que generan.',
            icon: Receipt,
            count: documento.impuestos.length,
            singular: 'tarifa',
            plural: 'tarifas',
        },
        {
            section: 'lotes',
            title: 'Lotes',
            description:
                'Los lotes facturados, con lo declarado y el peso que respalda cada uno.',
            icon: Boxes,
            count: documento.lotes.length,
            singular: 'lote',
            plural: 'lotes',
        },
    ]

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => {
                const isSelected = card.section === selected

                return (
                    <Link
                        key={card.section}
                        to="/ver-detalles-documento-fiscal"
                        search={{ documentoId, seccion: card.section }}
                        aria-current={isSelected ? 'page' : undefined}
                        className={cn(
                            'group flex items-start gap-4 rounded-2xl border p-5 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                            isSelected
                                ? 'border-brand/40 bg-brand/5 shadow-clay-card'
                                : 'border-border-ui bg-surface hover:border-brand/30 hover:bg-brand/[0.035]',
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'grid size-10 shrink-0 place-items-center rounded-2xl border transition-colors',
                                isSelected
                                    ? 'border-brand/30 bg-brand/15 text-brand'
                                    : 'border-border-ui bg-bg-app text-text-muted group-hover:text-brand',
                            )}
                        >
                            <card.icon className="size-5" />
                        </span>

                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-text-main">
                                    {card.title}
                                </h2>

                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest tabular-nums',
                                        isSelected
                                            ? 'border-brand/20 bg-brand/10 text-brand'
                                            : 'border-border-ui bg-bg-app text-text-muted',
                                    )}
                                >
                                    {card.count}{' '}
                                    {card.count === 1 ? card.singular : card.plural}
                                </span>
                            </div>

                            <p className="text-xs leading-relaxed text-text-muted">
                                {card.description}
                            </p>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
