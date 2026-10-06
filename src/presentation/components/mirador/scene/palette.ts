import { Color } from 'three'

/**
 * Los colores de la escena, derivados de los tokens del proyecto (`styles.css`)
 * para que el tablero cambie con el tema igual que el resto de la app.
 */
export interface ScenePalette {
    dark: boolean
    board: string
    boardSide: string
    tile: string
    tileSide: string
    tileInk: string
    tileLine: string
    pallet: string
    palletSide: string
    ok: string
    desviado: string
    fuera: string
    brand: string
    scaleBase: string
    scalePlat: string
    scaleStripe: string
    chevron: string
    shadowOpacity: number
    hemiSky: string
    hemiGround: string
    hemiIntensity: number
    sunIntensity: number
    rimIntensity: number
    envIntensity: number
    glow: number
    disc: string
    discOpacity: number
}

const hex = (c: Color) => `#${c.getHexString()}`
const mix = (a: string, b: string, t: number) => hex(new Color(a).lerp(new Color(b), t))
const rgba = (c: string, a: number) => new Color(c).getStyle().replace('rgb(', 'rgba(').replace(')', `,${a})`)

export function readPalette(): ScenePalette {
    const root = document.documentElement
    const css = getComputedStyle(root)
    const token = (nombre: string, respaldo: string) => css.getPropertyValue(nombre).trim() || respaldo
    const dark = root.classList.contains('dark')

    const brand = token('--brand', dark ? '#6FC48E' : '#2E6B45')
    const surface = token('--surface', dark ? '#111827' : '#ffffff')
    const bgApp = token('--bg-app', dark ? '#090d16' : '#f9fafb')
    const muted = token('--text-muted', dark ? '#94a3b8' : '#64748b')
    const ok = token('--success', dark ? '#34d399' : '#10b981')
    const desviado = token('--warning', dark ? '#fbbf24' : '#d97706')
    const fuera = token('--destructive', dark ? '#f87171' : '#ef4444')

    if (dark) {
        return {
            dark, brand, ok, desviado, fuera,
            board: mix(surface, brand, 0.07),
            boardSide: mix(bgApp, brand, 0.05),
            tile: mix(surface, '#ffffff', 0.07),
            tileSide: mix(surface, '#000000', 0.2),
            tileInk: rgba(muted, 0.62),
            tileLine: rgba(muted, 0.32),
            pallet: '#64553F',
            palletSide: '#4A3E2F',
            scaleBase: '#0D1310',
            scalePlat: '#2A3731',
            scaleStripe: '#E8B92A',
            chevron: mix(surface, muted, 0.35),
            shadowOpacity: 0.5,
            hemiSky: '#CFDDF5',
            hemiGround: '#1A2420',
            hemiIntensity: 1.5,
            sunIntensity: 1.7,
            rimIntensity: 1.0,
            envIntensity: 0.25,
            glow: 0.32,
            disc: mix(surface, '#000000', 0.15),
            discOpacity: 0.92,
        }
    }

    return {
        dark, brand, ok, desviado, fuera,
        board: mix(bgApp, brand, 0.06),
        boardSide: mix(bgApp, brand, 0.2),
        tile: surface,
        tileSide: mix(surface, brand, 0.1),
        tileInk: rgba(muted, 0.7),
        tileLine: rgba(muted, 0.3),
        pallet: '#E9DCC4',
        palletSide: '#CDB894',
        scaleBase: '#24302A',
        scalePlat: '#3B4943',
        scaleStripe: '#F2C230',
        chevron: mix(bgApp, muted, 0.35),
        shadowOpacity: 0.17,
        hemiSky: '#FFFFFF',
        hemiGround: '#B5C3B1',
        hemiIntensity: 1.9,
        sunIntensity: 1.9,
        rimIntensity: 0.6,
        envIntensity: 0.35,
        glow: 0.05,
        disc: surface,
        discOpacity: 0.9,
    }
}
