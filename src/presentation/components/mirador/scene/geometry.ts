import { ExtrudeGeometry, LatheGeometry, Shape, Vector2, type BufferGeometry } from 'three'

import { CHIP_R, CHIP_T } from './layout'

const cache = new Map<string, BufferGeometry>()

function roundedRect(w: number, d: number, r: number): Shape {
    const s = new Shape()
    const x = -w / 2
    const y = -d / 2
    s.moveTo(x + r, y)
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r)
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
    return s
}

/**
 * Losa con las esquinas redondeadas y el canto biselado, apoyada en `y = 0`:
 * la pieza base del look "clay". Se cachea por medida.
 */
export function slab(w: number, h: number, d: number, r: number, bevel = 0.05): BufferGeometry {
    const clave = `slab|${w}|${h}|${d}|${r}|${bevel}`
    const enCache = cache.get(clave)
    if (enCache) return enCache
    const b = Math.min(bevel, h / 2.2)
    const g = new ExtrudeGeometry(roundedRect(w - 2 * b, d - 2 * b, Math.max(0.01, r - b)), {
        depth: Math.max(0.001, h - 2 * b),
        bevelEnabled: true,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 3,
        curveSegments: 8,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, b, 0)
    g.computeVertexNormals()
    cache.set(clave, g)
    return g
}

/** Ficha de pesaje: un disco con el canto redondeado, como una ficha de juego. */
export const chipGeometry = new LatheGeometry([
    new Vector2(0, 0),
    new Vector2(CHIP_R - 0.035, 0),
    new Vector2(CHIP_R, 0.028),
    new Vector2(CHIP_R, CHIP_T - 0.028),
    new Vector2(CHIP_R - 0.035, CHIP_T),
    new Vector2(0, CHIP_T),
], 36)

/** Las geometrías cacheadas viven lo que vive la página; se liberan al desmontar la escena. */
export function disposeGeometryCache() {
    cache.forEach((g) => g.dispose())
    cache.clear()
}
