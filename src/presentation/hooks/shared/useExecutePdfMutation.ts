import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import {
  httpRequest,
  type HttpMethod,
  type HttpRequestOptions,
  type QueryParams,
} from '#/infrastructure/http/http-client'
import { withErrorToast } from '#/presentation/hooks/shared/errorToast'

/**
 * Pide un documento binario —un PDF— y deja lista una object URL para abrirlo
 * o embeberlo.
 *
 * El `method` es configurable: con `GET` cubre el caso que el template
 * resolvía con un archivo aparte (`queryPdfAbstraction`), mandando las
 * variables como query params en vez de como cuerpo.
 *
 * A diferencia del template, que creaba una object URL por llamada y no la
 * liberaba nunca, acá se revoca la anterior al generar otra y en el desmontaje:
 * si no, cada PDF generado queda en memoria hasta recargar la página.
 */

type UseExecutePdfMutationOptions<TVariables> = Omit<
  UseMutationOptions<Blob, Error, TVariables>,
  'mutationFn'
> & {
  /** @default 'POST' */
  method?: HttpMethod
  headers?: HeadersInit
}

interface UseExecutePdfMutationResult<TVariables> {
  /** Resuelve con la object URL del documento. Rechaza igual que `mutateAsync`. */
  generar: (variables: TVariables) => Promise<string>
  generando: boolean
  /** Object URL del último documento generado, o `null` si todavía no hay ninguno. */
  url: string | null
}

export function useExecutePdfMutation<TVariables = void>(
  endpoint: string | ((variables: TVariables) => string),
  options?: UseExecutePdfMutationOptions<TVariables>,
): UseExecutePdfMutationResult<TVariables> {
  const { method = 'POST', headers, ...mutationOptions } = options ?? {}

  const [url, setUrl] = useState<string | null>(null)

  // La URL viva también en un ref: el cleanup del desmontaje necesita leerla
  // sin volver a suscribirse en cada cambio.
  const urlRef = useRef<string | null>(null)

  const fijarUrl = useCallback((nueva: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = nueva
    setUrl(nueva)
  }, [])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    },
    [],
  )

  const mutation = useMutation<Blob, Error, TVariables>({
    mutationFn: (variables) => {
      const destino = typeof endpoint === 'function' ? endpoint(variables) : endpoint

      // Un GET no lleva cuerpo: las variables viajan como query params.
      const peticion: HttpRequestOptions =
        method === 'GET'
          ? { method, params: variables as QueryParams, headers, parsear: 'blob' }
          : { method, body: variables, headers, parsear: 'blob' }

      return httpRequest<Blob>(destino, peticion)
    },
    ...mutationOptions,
    onError: withErrorToast(mutationOptions.onError),
  })

  const { mutateAsync } = mutation

  const generar = useCallback(
    async (variables: TVariables): Promise<string> => {
      const blob = await mutateAsync(variables)
      const nueva = URL.createObjectURL(blob)
      fijarUrl(nueva)
      return nueva
    },
    [mutateAsync, fijarUrl],
  )

  return { generar, generando: mutation.isPending, url }
}
