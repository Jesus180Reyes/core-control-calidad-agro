export type EstadoCliente = 'ACTIVO' | 'PENDIENTE' | 'INACTIVO'

export type IconoCliente = 'bike' | 'shield' | 'building'

export interface SkuParametro {
  id: string
  sku: string
  nombre: string
  pesoIdealKg: number
  toleranciaMinPct: number
  toleranciaMaxPct: number
}

export interface ClienteParametro {
  id: string
  nombre: string
  segmento: string
  estado: EstadoCliente
  icono: IconoCliente
  skus: SkuParametro[]
}
