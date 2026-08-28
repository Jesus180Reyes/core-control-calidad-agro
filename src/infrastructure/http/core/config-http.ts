/**
 * Configuración compartida del cliente HTTP. Módulo puro: no importa nada.
 *
 * Existe para que `interceptores/refresh-token.ts` apunte a la misma base que la
 * fachada sin importarla —`http-client.ts` lo importa a él, así que sería un
 * ciclo— ni releer `import.meta.env` por su cuenta, que dejaría dos fuentes de
 * verdad para la URL del API.
 */

/** Base de todas las peticiones. Vite la inyecta en build time. */
export const BASE_URL: string = import.meta.env.VITE_API_URL ?? ''

/** Tope de espera por petición, sobreescribible por llamada. */
export const TIMEOUT_POR_DEFECTO_MS = 15_000
