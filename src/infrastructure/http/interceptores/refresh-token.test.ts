// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests de la renovación del access token y del reintento del 401 que vive en
 * la fachada (`http-client.ts`).
 *
 * Es la única pieza del cliente HTTP con estado compartido entre peticiones
 * —el refresh en vuelo— y la que no se puede verificar a ojo: un single-flight
 * roto se manifiesta como una tormenta de refreshes contra el backend, no como
 * un error en pantalla.
 *
 * `refrescoEnVuelo` es estado de módulo, así que cada caso reimporta la fachada
 * con `vi.resetModules()` para arrancar de cero.
 */

const CLAVE_TOKEN = 'auth_token'
const CLAVE_USUARIO = 'auth_user'
const CLAVE_REFRESH = 'auth_refresh'

const USUARIO = { complete_name: 'Operario de Planta', rol: 'operario' }

interface RespuestaFalsa {
    status: number
    body: unknown
}

/** Lo que el handler de cada test devuelve, traducido a una `Response` real. */
function construirRespuesta({ status, body }: RespuestaFalsa): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    })
}

type Handler = (url: string, init: RequestInit) => RespuestaFalsa | Promise<RespuestaFalsa>

interface Llamada {
    url: string
    autorizacion: string | null
}

/** Reemplaza a `globalThis.fetch` y registra cada petición con su Authorization. */
function instalarFetchFalso(handler: Handler) {
    const llamadas: Llamada[] = []

    const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(entrada)
        llamadas.push({
            url,
            autorizacion: new Headers(init.headers).get('Authorization'),
        })
        return construirRespuesta(await handler(url, init))
    })

    vi.stubGlobal('fetch', fetchFalso)

    const deEndpoint = (fragmento: string) => llamadas.filter((l) => l.url.includes(fragmento))

    return { llamadas, deEndpoint }
}

/** Sesión completa en localStorage, como la deja un login exitoso. */
function sembrarSesion({ conRefresh = true } = {}) {
    localStorage.setItem(CLAVE_TOKEN, 'access-viejo')
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(USUARIO))
    if (conRefresh) localStorage.setItem(CLAVE_REFRESH, 'refresh-viejo')
}

/** La fachada guarda el refresh en vuelo en estado de módulo: hay que reimportarla. */
async function importarFachada() {
    vi.resetModules()
    return await import('../http-client')
}

let irALogin: ReturnType<typeof vi.fn>

beforeEach(() => {
    localStorage.clear()

    // jsdom no implementa la navegación: sin este stub, `location.assign` tira
    // "Not implemented" y ensucia la consola de cada caso que cierra sesión.
    irALogin = vi.fn()
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, assign: irALogin },
    })
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('refresh del access token', () => {
    it('ante un 401 renueva el token y reintenta la petición original', async () => {
        sembrarSesion()
        let intentosPesajes = 0

        const { deEndpoint } = instalarFetchFalso((url) => {
            if (url.includes('/auth/refresh')) {
                return { status: 200, body: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' } }
            }
            intentosPesajes += 1
            return intentosPesajes === 1
                ? { status: 401, body: { message: 'Token expirado' } }
                : { status: 200, body: { ok: true, pesajes: [] } }
        })

        const { httpGet } = await importarFachada()
        const datos = await httpGet<{ ok: boolean }>('/pesajes')

        expect(datos).toEqual({ ok: true, pesajes: [] })

        // Tres peticiones: la que falló, el refresh, y el reintento.
        const pesajes = deEndpoint('/pesajes')
        expect(pesajes).toHaveLength(2)
        expect(deEndpoint('/auth/refresh')).toHaveLength(1)

        // El reintento sale con el token nuevo, no con el que acaba de rebotar.
        expect(pesajes[0].autorizacion).toBe('Bearer access-viejo')
        expect(pesajes[1].autorizacion).toBe('Bearer access-nuevo')

        expect(localStorage.getItem(CLAVE_TOKEN)).toBe('access-nuevo')
        expect(localStorage.getItem(CLAVE_REFRESH)).toBe('refresh-nuevo')
        expect(irALogin).not.toHaveBeenCalled()
    })

    it('dos 401 simultáneos disparan un solo refresh', async () => {
        sembrarSesion()
        const intentos: Record<string, number> = {}

        const { deEndpoint } = instalarFetchFalso(async (url) => {
            if (url.includes('/auth/refresh')) {
                // Un tick de demora: obliga a que el segundo 401 llegue con el
                // refresh todavía en vuelo, que es el caso que importa.
                await new Promise((resolver) => setTimeout(resolver, 5))
                return { status: 200, body: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' } }
            }

            const clave = url.includes('/clientes') ? 'clientes' : 'lotes'
            intentos[clave] = (intentos[clave] ?? 0) + 1
            return intentos[clave] === 1
                ? { status: 401, body: { message: 'Token expirado' } }
                : { status: 200, body: { ok: true } }
        })

        const { httpGet } = await importarFachada()
        const [clientes, lotes] = await Promise.all([httpGet('/clientes'), httpGet('/lotes')])

        expect(clientes).toEqual({ ok: true })
        expect(lotes).toEqual({ ok: true })

        expect(deEndpoint('/auth/refresh')).toHaveLength(1)

        // Las dos se reintentaron, y las dos con el token nuevo.
        expect(deEndpoint('/clientes')[1].autorizacion).toBe('Bearer access-nuevo')
        expect(deEndpoint('/lotes')[1].autorizacion).toBe('Bearer access-nuevo')
    })

    it('si el refresh falla cierra sesión y devuelve el error original', async () => {
        sembrarSesion()

        const { deEndpoint } = instalarFetchFalso((url) => {
            if (url.includes('/auth/refresh')) {
                return { status: 401, body: { message: 'Refresh token inválido' } }
            }
            return { status: 401, body: { message: 'Token expirado' } }
        })

        const { httpGet, esHttpError } = await importarFachada()
        const error = await httpGet('/pesajes').catch((e: unknown) => e)

        expect(esHttpError(error)).toBe(true)
        // El error que sale es el de `/pesajes`, no el del refresh: a quien llamó
        // le importa que su petición falló, no la mecánica de la renovación.
        expect((error as { body: { message: string } }).body.message).toBe('Token expirado')

        expect(deEndpoint('/auth/refresh')).toHaveLength(1)
        expect(deEndpoint('/pesajes')).toHaveLength(1)

        expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull()
        expect(localStorage.getItem(CLAVE_USUARIO)).toBeNull()
        expect(localStorage.getItem(CLAVE_REFRESH)).toBeNull()
        expect(irALogin).toHaveBeenCalledWith('/login')
    })

    it('sin refresh token guardado cierra sesión sin intentar renovar', async () => {
        sembrarSesion({ conRefresh: false })

        const { deEndpoint } = instalarFetchFalso(() => ({
            status: 401,
            body: { message: 'Token expirado' },
        }))

        const { httpGet } = await importarFachada()
        await expect(httpGet('/pesajes')).rejects.toThrow()

        // El comportamiento previo al SPEC 06, intacto.
        expect(deEndpoint('/auth/refresh')).toHaveLength(0)
        expect(deEndpoint('/pesajes')).toHaveLength(1)
        expect(localStorage.getItem(CLAVE_TOKEN)).toBeNull()
        expect(irALogin).toHaveBeenCalledWith('/login')
    })

    it('el 401 del login no dispara refresh ni cierra sesión', async () => {
        // Sin sesión sembrada: es exactamente el estado de quien está logueándose.
        const { deEndpoint } = instalarFetchFalso(() => ({
            status: 401,
            body: { message: 'Credenciales inválidas' },
        }))

        const { httpPost } = await importarFachada()
        const error = await httpPost('/auth/login', { username: 'x', password: 'y' }).catch(
            (e: unknown) => e,
        )

        expect((error as { body: { message: string } }).body.message).toBe('Credenciales inválidas')
        expect(deEndpoint('/auth/refresh')).toHaveLength(0)
        expect(deEndpoint('/auth/login')).toHaveLength(1)
        expect(irALogin).not.toHaveBeenCalled()
    })

    it('si el reintento vuelve a dar 401 no entra en bucle', async () => {
        sembrarSesion()

        const { deEndpoint } = instalarFetchFalso((url) => {
            if (url.includes('/auth/refresh')) {
                return { status: 200, body: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' } }
            }
            return { status: 401, body: { message: 'Token expirado' } }
        })

        const { httpGet } = await importarFachada()
        await expect(httpGet('/pesajes')).rejects.toThrow()

        // Exactamente dos peticiones al endpoint original y un solo refresh.
        expect(deEndpoint('/pesajes')).toHaveLength(2)
        expect(deEndpoint('/auth/refresh')).toHaveLength(1)
    })
})
