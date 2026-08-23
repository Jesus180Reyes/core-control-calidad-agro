import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
    label?: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
} as const

export function LoadingState({
    label,
    size = 'md',
    className = 'py-16',
}: LoadingStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 ${className}`}
        >
            <Loader2 className={`animate-spin text-text-muted ${sizes[size]}`} />

            {label && <p className="text-sm text-text-muted">{label}</p>}
        </div>
    )
}
