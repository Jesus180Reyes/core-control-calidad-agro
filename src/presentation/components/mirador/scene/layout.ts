import type { ActiveStage } from '#/presentation/types/mirador/plantTwin.types'

/** Medidas del tablero, en unidades de escena (una tarima mide 2.4). */
export const ROW = 8.7
export const TERR_D = 7.7
export const TERR_TOP = 0.35
export const TILE_W = 6.3
export const TILE_D = 6.9
export const TILE_TOP = 0.43
export const TILE_X = [4.45, 11.25, 18.05]
export const STRIP_X0 = 0.6
export const STRIP_X1 = 21.8
export const BOARD_X0 = -13
export const BOARD_X1 = 24.2
export const SCALE_X = -7.4

export const STAGE_INDEX: Record<ActiveStage, number> = { 'en-pesaje': 0, 'por-aprobar': 1, 'despacho': 2 }

/** Atrás-izquierda, atrás-derecha, adelante-izquierda, adelante-derecha. */
export const SLOT_OFFSETS = [
    { x: -1.45, z: -1.85 },
    { x: 1.45, z: -1.85 },
    { x: -1.45, z: 0.9 },
    { x: 1.45, z: 0.9 },
]

/** Las filas crecen hacia adelante; la cámara y el tablero se centran en el rango usado. */
export function rowZ(row: number): number {
    return row * ROW
}

export function slotPosition(row: number, stage: ActiveStage, slot: number) {
    const o = SLOT_OFFSETS[slot] ?? SLOT_OFFSETS[0]
    return { x: TILE_X[STAGE_INDEX[stage]] + o.x, y: TILE_TOP, z: rowZ(row) + o.z }
}

/** Ficha: radio, alto y paso de apilado. */
export const CHIP_R = 0.34
export const CHIP_T = 0.12
export const CHIP_H = 0.132

/** Tope visual de fichas por tarima; la etiqueta dice siempre el número real. */
export const CAP_IN = 27
export const CAP_OUT = 9

/** Tres pilas para lo que está en rango y una aparte para lo que no. */
export const STACKS = [{ x: -0.55, z: -0.5 }, { x: 0.55, z: -0.5 }, { x: -0.55, z: 0.55 }]
export const RED_STACK = { x: 0.62, z: 0.62 }
