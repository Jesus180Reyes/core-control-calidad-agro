import { cn } from '#/lib/utils'
import { formatDate } from '#/presentation/helpers/date/formatDate'
import { formatDateOnly } from '#/presentation/helpers/date/formatDateOnly'
import { formatDecimal } from '#/presentation/helpers/number/formatDecimal'
import { formatMoney } from '#/presentation/helpers/number/formatMoney'
import { useGetDetalleDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useGetDetalleDocumentoFiscal'

const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted'

interface SummaryField {
    label: string
    value: string | null
    mono?: boolean
}

interface DocumentoFiscalSummaryProps {
    documentoId: number
}

/**
 * La ficha del documento, arriba de las secciones. Se lee como un comprobante:
 * quién, cuánto y con qué número a la izquierda; el total solo a la derecha, y
 * debajo de la línea punteada el resto de los datos fiscales.
 */
export function DocumentoFiscalSummary({ documentoId }: DocumentoFiscalSummaryProps) {
    const { documento } = useGetDetalleDocumentoFiscal({ documentoId })

    const isVoided = documento.isActive === 0

    const fields: SummaryField[] = [
        { label: 'Emisión', value: formatDateOnly(documento.fecha_emision) },
        {
            label: documento.pais.etiqueta_autorizacion,
            value: documento.autorizacion,
            mono: true,
        },
        { label: 'Tipo de cambio', value: formatDecimal(documento.tipo_cambio) },
        { label: 'Exento', value: formatMoney(documento.importe_exento, documento.moneda) },
        { label: 'Exonerado', value: formatMoney(documento.importe_exonerado, documento.moneda) },
        { label: 'País destino', value: documento.pais_destino },
        { label: 'Ref. exención', value: documento.referencia_exencion, mono: true },
        { label: 'Documento aduanero', value: documento.documento_aduanero, mono: true },
    ]

    return (
        <article className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-[28px] border border-border-ui/60 bg-surface shadow-clay-card duration-500">
            <div className="flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className={LABEL_CLASS}>{documento.tipo_documento}</span>
                        <StatusPill isVoided={isVoided} />
                    </div>

                    <h2
                        className={cn(
                            'break-all font-mono text-2xl font-bold tracking-tight text-text-main sm:text-3xl',
                            isVoided && 'text-text-muted line-through decoration-destructive/60 decoration-2',
                        )}
                    >
                        {documento.numero_completo}
                    </h2>

                    <p className="text-sm text-text-muted">
                        <span className="font-semibold text-text-main">{documento.cliente}</span>
                        <span aria-hidden className="mx-2 text-border-ui">
                            /
                        </span>
                        {documento.pais.etiqueta_identificacion}{' '}
                        <span className="font-mono text-text-main">{documento.cliente_rtn}</span>
                    </p>
                </div>

                <div className="shrink-0 rounded-3xl bg-bg-app px-5 py-4 shadow-clay-inset md:min-w-60 md:text-right">
                    <p className={LABEL_CLASS}>Total</p>
                    <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-text-main">
                        <span className="mr-1.5 text-sm font-semibold text-text-muted">
                            {documento.moneda}
                        </span>
                        {formatMoney(documento.total)}
                    </p>
                </div>
            </div>

            <div aria-hidden className="mx-5 border-t-2 border-dashed border-border-ui sm:mx-7" />

            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:p-7 lg:grid-cols-4">
                {fields.map((field) => (
                    <div key={field.label} className="min-w-0 space-y-1">
                        <dt className={LABEL_CLASS}>{field.label}</dt>
                        <dd
                            className={cn(
                                'truncate text-sm font-semibold tabular-nums text-text-main',
                                field.mono && 'font-mono font-medium',
                                !field.value && 'font-normal text-text-muted',
                            )}
                            title={field.value ?? undefined}
                        >
                            {field.value || '—'}
                        </dd>
                    </div>
                ))}
            </dl>

            {isVoided && (
                <div className="mx-3 mb-3 rounded-[20px] bg-destructive/[0.06] px-4 py-3.5 sm:mx-4 sm:mb-4 sm:px-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">
                        Anulado
                        {documento.anulado_por && ` por ${documento.anulado_por}`}
                        {documento.anulado_en && ` · ${formatDate(documento.anulado_en)}`}
                    </p>
                    {documento.motivo_anulacion && (
                        <p className="mt-1 text-sm text-text-main">{documento.motivo_anulacion}</p>
                    )}
                </div>
            )}
        </article>
    )
}

function StatusPill({ isVoided }: { isVoided: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                isVoided ? 'bg-destructive/10 text-destructive' : 'bg-brand/10 text-brand',
            )}
        >
            <span
                aria-hidden
                className={cn('size-1.5 rounded-full', isVoided ? 'bg-destructive' : 'bg-brand')}
            />
            {isVoided ? 'Anulado' : 'Vigente'}
        </span>
    )
}
