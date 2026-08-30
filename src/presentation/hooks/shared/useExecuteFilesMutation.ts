import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { httpRequest, type HttpMethod } from '#/infrastructure/http/http-client'
import { aFormData } from '#/infrastructure/http/transportes/cuerpo-multipart'
import { withErrorToast } from '#/presentation/hooks/shared/errorToast'

/**
 * Igual que `useExecuteMutation`, pero manda el cuerpo como `multipart/form-data`.
 * Es el hook de cualquier pantalla que suba archivos.
 *
 * El `Content-Type` no se fija: el cliente lo omite ante un `FormData` para que
 * el navegador ponga el `boundary`.
 */

/** `GET` queda afuera: una petición con cuerpo multipart no puede ser un GET. */
type MetodoConCuerpo = Exclude<HttpMethod, 'GET'>

type UseExecuteFilesMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
> & {
  /** @default 'POST' */
  method?: MetodoConCuerpo
  headers?: HeadersInit
}

export function useExecuteFilesMutation<TData, TVariables extends Record<string, unknown>>(
  endpoint: string | ((variables: TVariables) => string),
  options?: UseExecuteFilesMutationOptions<TData, TVariables>,
) {
  const { method = 'POST', headers, ...mutationOptions } = options ?? {}

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint
      return httpRequest<TData>(url, { method, body: aFormData(variables), headers })
    },
    ...mutationOptions,
    onError: withErrorToast(mutationOptions.onError),
  })
}
