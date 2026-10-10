import { useState } from 'react'
import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '#/lib/utils'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { SUNKEN_TRACK_CLASS, TONE_BAND, TONE_FILL, TONE_TEXT } from './metricsStyles'

/**
 * El "?" de la tarjeta de desviación: abre un diálogo que explica qué mide el
 * número, la dispersión y el medidor. El estado es local porque no le importa
 * a nadie más del tablero.
 */
export function DeviationHelpDialog() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="¿Qué es la desviación frente al ideal?"
                className="-m-1 cursor-pointer rounded-full p-1 text-text-muted transition-colors hover:text-text-main focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
                <CircleHelp className="size-4" strokeWidth={2.2} aria-hidden />
            </button>

            <CustomDialog
                open={open}
                onOpenChange={setOpen}
                title="Desviación frente al ideal"
                description="Cuánto se alejan los pesajes del peso ideal de su producto."
                size="lg"
                footer={
                    <CustomButton variant="secondary" fullWidth={false} onClick={() => setOpen(false)}>
                        Entendido
                    </CustomButton>
                }
            >
                <div className="space-y-5 py-1 text-sm text-text-main">
                    <HelpSection title="El número grande">
                        Es el promedio, en porcentaje, de cuánto se apartó cada pesaje del peso ideal
                        de su producto. Un bulto de 11 kg con un ideal de 10 kg se desvía un +10 %.
                        Tiene signo:
                        <ul className="mt-2 space-y-1.5">
                            <ToneItem tone="warning" label="Positivo">
                                por encima del ideal: se está entregando producto de más.
                            </ToneItem>
                            <ToneItem tone="destructive" label="Negativo">
                                por debajo del ideal: hay riesgo de reclamo del cliente.
                            </ToneItem>
                            <ToneItem tone="brand" label="Cerca de 0">
                                los pesajes caen, en promedio, sobre el ideal.
                            </ToneItem>
                        </ul>
                    </HelpSection>

                    <HelpSection title="La dispersión (±)">
                        Es la desviación estándar: cuánto varían los pesajes entre sí. Un promedio
                        de 0 % con una dispersión grande no es bueno: quiere decir que hay bultos
                        muy pesados compensando a otros muy livianos. Cuanto más chica, más parejo
                        es el pesaje.
                    </HelpSection>

                    <HelpSection title="El medidor">
                        <GaugeExample />
                        El centro es el ideal (0 %). El punto marca el promedio y la franja
                        translúcida cubre el promedio ± la dispersión, que es donde cae la mayoría
                        de los pesajes. La escala se ajusta sola y tiene un tope de ±50 %: si el
                        promedio se pasa, el punto queda en el borde con una flecha y el número de
                        arriba sigue mostrando el valor real.
                    </HelpSection>

                    <p className="rounded-2xl bg-bg-app px-4 py-3 text-xs text-text-muted">
                        Los valores los calcula el sistema sobre los pesajes del período y los
                        filtros elegidos. Sin pesajes se muestra "—".
                    </p>
                </div>
            </CustomDialog>
        </>
    )
}

function HelpSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                {title}
            </h4>
            <div className="leading-relaxed">{children}</div>
        </section>
    )
}

interface ToneItemProps {
    tone: 'brand' | 'warning' | 'destructive'
    label: string
    children: ReactNode
}

function ToneItem({ tone, label, children }: ToneItemProps) {
    return (
        <li className="flex items-baseline gap-2">
            <span aria-hidden className={cn('size-2 shrink-0 -translate-y-px rounded-full', TONE_FILL[tone])} />
            <span>
                <span className={cn('font-semibold', TONE_TEXT[tone])}>{label}</span>: {children}
            </span>
        </li>
    )
}

/** Un medidor de muestra, estático: +10 % ± 15 % sobre una escala de ±30. */
function GaugeExample() {
    return (
        <div aria-hidden className="mb-3 flex items-center gap-3">
            <span className="text-[10px] font-semibold text-text-muted">−30</span>
            <div className={cn('relative h-2.5 flex-1', SUNKEN_TRACK_CLASS)}>
                <span className="absolute inset-y-0.5 left-1/2 w-px -translate-x-1/2 bg-text-muted/30" />
                <span
                    className={cn('absolute inset-y-0 rounded-full', TONE_BAND.warning)}
                    style={{ left: '41.67%', width: '50%' }}
                />
                <span
                    className={cn(
                        'absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface',
                        TONE_FILL.warning,
                    )}
                    style={{ left: '66.67%' }}
                />
            </div>
            <span className="text-[10px] font-semibold text-text-muted">+30</span>
        </div>
    )
}
