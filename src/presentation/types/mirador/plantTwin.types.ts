/**
 * Contrato de `GET /plantas/en-vivo` (SPEC 13). El endpoint todavía no existe:
 * hoy lo imita `plantSnapshotMock.ts` con esta misma forma, así que conectarlo
 * toca sólo el interior de `usePlantTwin`.
 */

/** Casilla del tablero. `rechazado` no tiene casilla: sólo viaja para animar la salida. */
export type PlantStage = 'en-pesaje' | 'por-aprobar' | 'finalizado' | 'despacho' | 'rechazado'

export type ActiveStage = Exclude<PlantStage, 'rechazado'>

export const ACTIVE_STAGES: ActiveStage[] = ['en-pesaje', 'por-aprobar', 'finalizado', 'despacho']

export const STAGE_LABEL: Record<PlantStage, string> = {
    'en-pesaje': 'En pesaje',
    'por-aprobar': 'Por aprobar',
    'finalizado': 'Finalizado',
    'despacho': 'Despacho',
    'rechazado': 'Rechazado',
}

export interface PlantSnapshotResponse {
    ok: boolean
    msg: string
    planta: PlantSnapshot
}

export interface PlantSnapshot {
    /** Reloj del servidor, ISO. */
    generado_en: string
    kpis: PlantKpis
    clientes: PlantClient[]
}

export interface PlantKpis {
    pesajes_hoy: number
    /** kg */
    peso_neto_hoy: number
    /** `null` sin pesajes hoy. */
    pct_en_rango_hoy: number | null
    /** `en-pesaje` + `por-aprobar`. */
    lotes_activos: number
    clientes_con_actividad_hoy: number
}

export interface PlantClient {
    id: number
    nombre: string
    producto: string | null
    codigo_exportacion: string | null
    lotes: PlantLot[]
}

export interface PlantLot {
    id: number
    nombre_lote: string
    producto: string
    unidad_medida: string
    etapa: PlantStage
    peso_minimo: string
    peso_ideal: string
    peso_maximo: string
    /** Pesajes activos del lote: la verdad del conteo. */
    bultos: number
    bultos_fuera_rango: number
    peso_neto_total: number
    /** `numero_completo` del documento fiscal activo; sólo en `despacho`. */
    documento_fiscal: string | null
    /** Los 10 más recientes, del más nuevo al más viejo. Sirve para animar, no para contar. */
    ultimos_pesajes: PlantWeighing[]
}

export interface PlantWeighing {
    id: number
    peso_neto: string
    /** 0/1, igual que `PesajeData`. */
    fuera_de_rango: number
    estado_calidad_codigo: string
    usuario: string
    created_at: string
}

/** Tamaño de `ultimos_pesajes`. */
export const RECENT_WINDOW = 10

export type QualityLevel = 'ok' | 'desviado' | 'fuera'

/** Lo que cambió entre dos fotos. La escena anima esto y nada más. */
export type PlantEvent =
    | { type: 'client-added'; clientId: number }
    | { type: 'client-removed'; clientId: number }
    | { type: 'lot-added'; clientId: number; lotId: number }
    | { type: 'lot-stage-changed'; clientId: number; lotId: number; from: ActiveStage; to: ActiveStage }
    | { type: 'lot-removed'; clientId: number; lotId: number; lastStage: ActiveStage; reason: 'salida' | 'rechazado' }
    | { type: 'weighing-added'; clientId: number; lotId: number; weighing: PlantWeighing }
    | { type: 'weighing-voided'; clientId: number; lotId: number; count: number }

/** Lugar estable de cada cliente (fila) y de cada lote (slot dentro de su casilla). */
export interface SlotMap {
    rows: Record<number, number>
    lots: Record<number, { stage: ActiveStage; slot: number }>
    /** Lotes que no entraron en su casilla, por cliente y etapa. */
    overflow: Record<number, Partial<Record<ActiveStage, number>>>
}

export type PlantLevel = 'planta' | 'cliente' | 'lote' | 'pesaje'

export interface PlantSelection {
    clientId: number | null
    lotId: number | null
    weighingId: number | null
}

/** Lo que se tocó en la escena. */
export type PlantPickTarget =
    | { kind: 'cliente'; clientId: number }
    | { kind: 'lote'; clientId: number; lotId: number }
    | { kind: 'pesaje'; clientId: number; lotId: number; weighingId: number }
    | { kind: 'bascula' }
