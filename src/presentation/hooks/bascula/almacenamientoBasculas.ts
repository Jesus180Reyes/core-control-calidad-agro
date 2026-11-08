/**
 * Persistencia local del selector de básculas.
 *
 * Módulo puro (sin React): claves de `localStorage` versionadas, en la línea de
 * `bascula-ui-theme` que ya usa el `ThemeProvider`. Toda lectura y escritura va
 * envuelta en `try/catch` con guarda de `typeof window`, porque el proyecto es
 * SSR (TanStack Start) y `localStorage` también puede fallar en modo privado o
 * con las cookies de terceros bloqueadas. Si no está disponible, el selector
 * funciona igual pero sin memoria entre sesiones.
 */

import type { ClaveBascula } from '#/presentation/types/control-calidad/selector-bascula.types'
import type {
    PollCommandId,
    ScaleMode,
    ScaleProfile,
    ScaleProfileSource,
    WeightUnit,
} from '#/presentation/types/control-calidad/perfil-bascula.types'
import {
    DETECTION_BYTE_FORMATS,
    FRAME_FORMATS,
    FRAME_TERMINATORS,
    POLL_COMMANDS,
} from './scaleDetection'

/** Mapa `clave → alias` de todas las básculas que recibieron nombre. */
export type MapaAlias = Record<ClaveBascula, string>

const CLAVE_ALIAS = 'bascula-alias:v1'
const CLAVE_PREFERIDA = 'bascula-preferida:v1'
const PROFILES_KEY = 'bascula-perfil:v1'

export type ScaleProfiles = Record<ClaveBascula, ScaleProfile>

/** `null` cuando no hay `window` o el navegador bloquea el acceso. */
function almacen(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage
    } catch {
        return null
    }
}

/**
 * Clave estable de una báscula a partir de la info USB de su puerto:
 * `"0403:6001"` (vendorId:productId en hex de 4 dígitos).
 *
 * Los puertos sin IDs USB (COM nativo) caen en `"sin-id:<índice>"`, que depende
 * del orden que devuelve `getPorts()` y por tanto puede cambiar entre sesiones.
 */
export function claveDePuerto(info: SerialPortInfo, indice: number): ClaveBascula {
    const { usbVendorId, usbProductId } = info

    if (usbVendorId === undefined || usbProductId === undefined) {
        return `sin-id:${indice}`
    }

    const hex = (valor: number) => valor.toString(16).padStart(4, '0')
    return `${hex(usbVendorId)}:${hex(usbProductId)}`
}

/** Todos los alias guardados. `{}` si no hay nada o el dato está corrupto. */
export function leerAlias(): MapaAlias {
    const storage = almacen()
    if (!storage) return {}

    try {
        const crudo = storage.getItem(CLAVE_ALIAS)
        if (!crudo) return {}

        const parseado: unknown = JSON.parse(crudo)
        if (typeof parseado !== 'object' || parseado === null || Array.isArray(parseado)) {
            return {}
        }

        // Se filtran los valores que no sean texto: el dato pudo escribirlo una
        // versión anterior del formato o quedar a medias.
        const alias: MapaAlias = {}
        for (const [clave, valor] of Object.entries(parseado)) {
            if (typeof valor === 'string') alias[clave] = valor
        }
        return alias
    } catch {
        return {}
    }
}

/** Guarda (o reemplaza) el alias de una báscula. */
export function guardarAlias(clave: ClaveBascula, alias: string): void {
    const storage = almacen()
    if (!storage) return

    try {
        storage.setItem(CLAVE_ALIAS, JSON.stringify({ ...leerAlias(), [clave]: alias }))
    } catch {
        // Cuota llena o escritura denegada: se sigue sin persistir.
    }
}

/** Clave de la báscula preferida, o `null` si nunca se eligió una. */
export function leerPreferida(): ClaveBascula | null {
    const storage = almacen()
    if (!storage) return null

    try {
        return storage.getItem(CLAVE_PREFERIDA)
    } catch {
        return null
    }
}

/** Marca una báscula como la preferida para la auto-conexión y la reconexión. */
export function guardarPreferida(clave: ClaveBascula): void {
    const storage = almacen()
    if (!storage) return

    try {
        storage.setItem(CLAVE_PREFERIDA, clave)
    } catch {
        // Igual que en `guardarAlias`: sin persistencia, pero sin romper el flujo.
    }
}

const UNITS: readonly WeightUnit[] = ['kg', 'lb', 'g', 'oz']
const POLL_COMMAND_IDS = Object.keys(POLL_COMMANDS) as PollCommandId[]
const MODES: readonly ScaleMode[] = ['continuo', 'consulta']
const SOURCES: readonly ScaleProfileSource[] = ['auto', 'manual']

const isOneOf = <T,>(options: readonly T[], value: unknown): value is T =>
    options.includes(value as T)

const isValidDate = (value: unknown): value is string =>
    typeof value === 'string' && !Number.isNaN(Date.parse(value))

function isScaleProfile(value: unknown): value is ScaleProfile {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const profile = value as Record<string, unknown>

    const validPollCommand = profile.mode === 'consulta'
        ? isOneOf(POLL_COMMAND_IDS, profile.pollCommand)
        : profile.pollCommand === null

    return profile.version === 1
        && typeof profile.baudRate === 'number'
        && Number.isInteger(profile.baudRate)
        && profile.baudRate > 0
        && isOneOf(DETECTION_BYTE_FORMATS, profile.byteFormat)
        && isOneOf(MODES, profile.mode)
        && validPollCommand
        && isOneOf(FRAME_FORMATS, profile.frameFormat)
        && isOneOf(FRAME_TERMINATORS, profile.terminator)
        && (profile.unit === null || isOneOf(UNITS, profile.unit))
        && isOneOf(SOURCES, profile.source)
        && isValidDate(profile.detectedAt)
}

export function readProfiles(): ScaleProfiles {
    const storage = almacen()
    if (!storage) return {}

    try {
        const raw = storage.getItem(PROFILES_KEY)
        if (!raw) return {}

        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

        const profiles: ScaleProfiles = {}
        for (const [clave, value] of Object.entries(parsed)) {
            if (isScaleProfile(value)) profiles[clave] = value
        }
        return profiles
    } catch {
        return {}
    }
}

export function readProfile(clave: ClaveBascula): ScaleProfile | null {
    return readProfiles()[clave] ?? null
}

export function saveProfile(clave: ClaveBascula, perfil: ScaleProfile): void {
    const storage = almacen()
    if (!storage) return

    try {
        storage.setItem(PROFILES_KEY, JSON.stringify({ ...readProfiles(), [clave]: perfil }))
    } catch {
        return
    }
}
