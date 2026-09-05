import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { Toaster } from '@/components/ui/sonner'
import { NotFound } from '#/presentation/components/shared/NotFound'
import { ThemeProvider } from '#/presentation/theme/ThemeProvider'
import { queryClient } from '#/infrastructure/query-client/query-client'
import appCss from '../styles.css?url'
const isDev = process.env.NODE_ENV === 'development'

export const Route = createRootRoute({
  notFoundComponent: () => <NotFound />,

  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Core Control Calidad Agro' },
      { name: 'description', content: 'Sistema Industrial de Control de Pesaje' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg-app text-text-main min-h-screen transition-colors duration-300">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system">
            {children || <Outlet />}

            <Toaster />
          </ThemeProvider>

          {isDev && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>

        {isDev && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}