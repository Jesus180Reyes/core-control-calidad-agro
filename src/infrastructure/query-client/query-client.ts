import { QueryClient } from '@tanstack/react-query'
import { esReintentable } from '#/infrastructure/http/core/http-errors'

/** Reintentos además del intento original: 3 peticiones como máximo. */
const MAX_REINTENTOS = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 5,

      // Quién se reintenta lo decide `esReintentable`, no este archivo: un 401,
      // un 404 o un 422 son definitivos y reintentarlos solo retrasa el error.
      retry: (intento, error) => intento < MAX_REINTENTOS && esReintentable(error),
      retryDelay: (intento) => Math.min(300 * 2 ** intento, 4000),
    },

    // Explícito aunque sea el valor por defecto: que una mutación no se
    // reintente sola es una decisión, no un olvido. Un POST reintentado puede
    // duplicar el registro que acaba de crear.
    mutations: {
      retry: 0,
    },
  },
})
