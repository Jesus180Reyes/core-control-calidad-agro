import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'bascula-ui-theme',
}: {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(storageKey) as Theme) || defaultTheme
        }
        return defaultTheme
    })


    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove('light', 'dark')

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    const setTheme = (theme: Theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, theme)
        }
        setThemeState(theme)
    }

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

// Hook personalizado para usar el tema de manera sencilla
export function useTheme() {
    const context = useContext(ThemeProviderContext)

    if (context === undefined) {
        throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider')
    }

    return context
}