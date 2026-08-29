import { QueryClient } from '@tanstack/react-query'
import { esReintentable } from '#/infrastructure/http/core/http-errors'

const MAX_REINTENTOS = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 5,
      retry: (intento, error) => intento < MAX_REINTENTOS && esReintentable(error),
      retryDelay: (intento) => Math.min(300 * 2 ** intento, 4000),
    },

    mutations: {
      retry: 0,
    },
  },
})
