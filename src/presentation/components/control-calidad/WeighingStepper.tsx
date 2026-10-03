import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Package, Printer, Scale, Users, type LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'
import type { Lote } from '#/presentation/types/lotes/lotes.types'

export type WeighingStep = 'cliente' | 'lote' | 'pesaje' | 'etiqueta'

const STEPS: { key: WeighingStep; title: string; icon: LucideIcon }[] = [
    { key: 'cliente', title: 'Cliente', icon: Users },
    { key: 'lote', title: 'Lote', icon: Package },
    { key: 'pesaje', title: 'Pesar', icon: Scale },
    { key: 'etiqueta', title: 'Etiqueta', icon: Printer },
]

interface WeighingStepperProps {
    current: WeighingStep
    cliente?: Cliente | null
    lote?: Lote | null
    className?: string
}

/**
 * El recorrido de un bulto, de la elección del cliente al ticket impreso. Los
 * pasos ya hechos muestran lo elegido y, si tienen pantalla propia, son un
 * link para volver a cambiarlo.
 */
export function WeighingStepper({ current, cliente, lote, className }: WeighingStepperProps) {
    const currentIndex = STEPS.findIndex((step) => step.key === current)

    return (
        <nav aria-label="Progreso del pesaje" className={className}>
            <ol className="flex items-center gap-2 sm:gap-3">
                {STEPS.map((step, index) => {
                    const done = index < currentIndex
                    const active = index === currentIndex
                    const Icon = done ? Check : step.icon

                    const detail =
                        step.key === 'cliente' ? cliente?.nombre
                            : step.key === 'lote' ? lote?.nombre_lote
                                : undefined

                    const content = (
                        <>
                            <span
                                className={cn(
                                    'grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-200',
                                    done && 'bg-brand text-white shadow-clay-btn',
                                    active && 'bg-brand/12 text-brand ring-2 ring-brand/40',
                                    !done && !active && 'bg-muted text-text-muted/70',
                                )}
                            >
                                <Icon className="size-4" strokeWidth={2.4} />
                            </span>
                            <span className="hidden min-w-0 leading-tight sm:block">
                                <span
                                    className={cn(
                                        'block text-[11px] font-black uppercase tracking-[0.14em]',
                                        active ? 'text-brand' : done ? 'text-text-main' : 'text-text-muted/70',
                                    )}
                                >
                                    {step.title}
                                </span>
                                {done && detail && (
                                    <span className="block max-w-36 truncate text-xs text-text-muted" title={detail}>
                                        {detail}
                                    </span>
                                )}
                            </span>
                        </>
                    )

                    const itemClassName = 'flex min-w-0 items-center gap-2.5 rounded-full'

                    // Sólo se vuelve a un paso ya hecho que tenga pantalla propia.
                    const link =
                        done && step.key === 'cliente' ? (
                            <Link to="/clientes" className={cn(itemClassName, 'group outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand/40')}>
                                {content}
                            </Link>
                        ) : done && step.key === 'lote' && cliente ? (
                            <Link
                                to="/lotes-clientes"
                                state={{ cliente }}
                                className={cn(itemClassName, 'group outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand/40')}
                            >
                                {content}
                            </Link>
                        ) : null

                    return (
                        <Fragment key={step.key}>
                            {index > 0 && (
                                <li
                                    aria-hidden
                                    className={cn(
                                        'h-0.5 min-w-4 flex-1 rounded-full transition-colors duration-200',
                                        index <= currentIndex ? 'bg-brand' : 'bg-border-ui',
                                    )}
                                />
                            )}
                            <li aria-current={active ? 'step' : undefined} className="min-w-0">
                                {link ?? <div className={itemClassName}>{content}</div>}
                            </li>
                        </Fragment>
                    )
                })}
            </ol>
        </nav>
    )
}
