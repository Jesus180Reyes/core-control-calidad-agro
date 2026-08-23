import type { ReactNode } from 'react'

interface EmptyStateProps {
    title: string
    description?: string
    icon?: ReactNode
    action?: ReactNode
    className?: string
}

export function EmptyState({
    title,
    description,
    icon,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`border border-dashed border-border-ui rounded-[28px] p-12 text-center space-y-2 ${className}`}
        >
            {icon && (
                <div className="flex justify-center text-text-muted">{icon}</div>
            )}

            <p className="text-text-main font-bold">{title}</p>

            {description && (
                <p className="text-sm text-text-muted">{description}</p>
            )}

            {action && <div className="pt-4">{action}</div>}
        </div>
    )
}
