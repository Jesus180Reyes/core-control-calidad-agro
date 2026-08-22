import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/')({ component: HomePage })

function HomePage() {
  // const { theme } = useTheme()

  // const activeTheme = theme === 'system'
  //   ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  //   : theme

  return (
    <></>
  )
}
