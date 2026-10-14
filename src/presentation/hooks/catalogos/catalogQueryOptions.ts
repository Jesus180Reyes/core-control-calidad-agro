
const CATALOG_CACHE_MS = 1000 * 60 * 10 // 10 minutos

export const CATALOG_QUERY_OPTIONS = {
  staleTime: CATALOG_CACHE_MS,
  gcTime: CATALOG_CACHE_MS,
}
