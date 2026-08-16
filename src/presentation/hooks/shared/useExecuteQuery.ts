import { useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query'
import { httpGet, type QueryParams } from '#/infrastructure/http/http-client'

type UseExecuteQueryOptions<TData> = Omit<UseSuspenseQueryOptions<TData>, 'queryKey' | 'queryFn'> & {
  params?: QueryParams
  headers?: HeadersInit
}

/**
 * Suspende el render mientras carga y lanza el error al ErrorBoundary más
 * cercano: el componente que llama a este hook debe estar envuelto en
 * <Suspense> y <ErrorBoundary> (ver #/presentation/components/shared/ErrorBoundary).
 */
export function useExecuteQuery<TData>(
  queryKey: unknown[],
  endpoint: string,
  options?: UseExecuteQueryOptions<TData>,
) {
  const { params, headers, ...queryOptions } = options ?? {}

  return useSuspenseQuery<TData>({
    queryKey,
    queryFn: ({ signal }) => httpGet<TData>(endpoint, { params, headers, signal }),
    ...queryOptions,
  })
}
