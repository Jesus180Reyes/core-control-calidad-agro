import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { httpRequest, type HttpMethod } from '#/infrastructure/http/http-client'
import { withErrorToast } from '#/presentation/hooks/shared/errorToast'

type UseExecuteMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
> & {
  /** @default 'POST' */
  method?: HttpMethod
  headers?: HeadersInit
}

export function useExecuteMutation<TData, TVariables = void>(
  endpoint: string | ((variables: TVariables) => string),
  options?: UseExecuteMutationOptions<TData, TVariables>,
) {
  const { method = 'POST', headers, ...mutationOptions } = options ?? {}

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint
      return httpRequest<TData>(url, { method, body: variables, headers })
    },
    ...mutationOptions,
    onError: withErrorToast(mutationOptions.onError),
  })
}
