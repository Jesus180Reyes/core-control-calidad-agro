import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'

interface CustomButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    isLoading?: boolean
    icon?: ReactNode
    children: ReactNode
}

export function CustomButton({
    variant = 'primary',
    isLoading = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
}: CustomButtonProps) {

    const baseStyles = "w-full font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100"

    const variantStyles: Record<ButtonVariant, string> = {
        primary: "bg-[#3F3FD4] hover:bg-[#3434B8] text-white py-4.5 lg:py-5 text-sm lg:text-base shadow-lg shadow-blue-500/10 dark:shadow-none disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600",

        secondary: "bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-4 px-4 text-xs lg:text-sm disabled:bg-slate-100/50 dark:disabled:bg-zinc-800/50 disabled:text-slate-400 dark:disabled:text-zinc-600",

        danger: "bg-red-600 hover:bg-red-700 text-white py-4 px-4 text-sm disabled:bg-red-100 dark:disabled:bg-red-950/20 disabled:text-red-400",

        success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 py-3 px-4 text-xs"
    }

    const isBtnDisabled = disabled || isLoading

    return (
        <button
            disabled={isBtnDisabled}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : (
                icon && <span className="shrink-0">{icon}</span>
            )}

            <span>{children}</span>
        </button>
    )
}