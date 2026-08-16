const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryParams = Record<string, string | number | boolean | undefined | null>

interface HttpRequestOptions {
  method: HttpMethod
  body?: unknown
  params?: QueryParams
  headers?: HeadersInit
  signal?: AbortSignal
}

type QueryRequestOptions = Pick<HttpRequestOptions, 'params' | 'headers' | 'signal'>
type MutationRequestOptions = Pick<HttpRequestOptions, 'headers' | 'signal'>

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text()

  if (!response.ok) {
    throw new HttpError(`${response.status} ${response.statusText}`, response.status, body)
  }

  return body as T
}

function buildUrl(endpoint: string, params?: QueryParams): string {
  const url = `${BASE_URL}${endpoint}`
  if (!params) return url

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.append(key, String(value))
  }

  const queryString = query.toString()
  return queryString ? `${url}?${queryString}` : url
}

/**
 * Base de todos los helpers http*. Serializa el body a JSON salvo que sea
 * FormData (en cuyo caso deja que el navegador ponga el boundary).
 */
export function httpRequest<T>(endpoint: string, options: HttpRequestOptions): Promise<T> {
  const { method, body, params, headers, signal } = options
  const isFormData = body instanceof FormData

  return fetch(buildUrl(endpoint, params), {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  }).then((response) => parseResponse<T>(response))
}

export function httpGet<T>(endpoint: string, options?: QueryRequestOptions): Promise<T> {
  return httpRequest<T>(endpoint, { method: 'GET', ...options })
}

export function httpPost<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T> {
  return httpRequest<T>(endpoint, { method: 'POST', body, ...options })
}

export function httpPut<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T> {
  return httpRequest<T>(endpoint, { method: 'PUT', body, ...options })
}

export function httpPatch<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T> {
  return httpRequest<T>(endpoint, { method: 'PATCH', body, ...options })
}

export function httpDelete<T>(endpoint: string, body?: unknown, options?: MutationRequestOptions): Promise<T> {
  return httpRequest<T>(endpoint, { method: 'DELETE', body, ...options })
}
