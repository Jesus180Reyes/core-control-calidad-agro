import { useTheme } from '#/presentation/theme/ThemeProvider'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/')({ component: HomePage })

function HomePage() {
  const { theme } = useTheme()

  const activeTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  return (
    <div className={activeTheme}>

      <div className="min-h-screen p-6 transition-colors duration-200 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">

        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-xl font-bold">Panel de la Báscula</h1>
        </header>

        <div className="light bg-slate-900 light:bg-white text-white light:text-slate-900 p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Indicador de Peso (Siempre Claro)</h2>
          <p className="text-3xl font-mono mt-2">0.00 kg</p>
        </div>

      </div>
    </div>
  )
}
