export interface OperacionData {
  cliente: string
  etapa: string
  lote: string
}

export interface ParametrosData {
  minimo: number
  ideal: number
  maximo: number
  /** Unidad del lote (`unidad_medida`); es la que se pinta junto a los pesos. */
  unidad: string
}