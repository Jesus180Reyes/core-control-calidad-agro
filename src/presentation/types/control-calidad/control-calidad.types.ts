export interface OperacionData {
  cliente: string
  etapa: string
  lote: string
}

export interface ParametrosData {
  minimo: number
  ideal: number
  maximo: number
}

export interface Muestra {
  id: string
  hora: string
  peso: number
  estado: 'DENTRO DE RANGO' | 'DESVIADO'
}