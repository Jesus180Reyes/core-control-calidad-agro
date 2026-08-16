import { useState } from 'react'
import type { ClienteParametro } from '#/presentation/types/parametros/parametros.types'

const CLIENTES_INICIALES: ClienteParametro[] = [
  {
    id: 'cli-agrolibano',
    nombre: 'Agrolibano',
    segmento: 'Cliente Premium',
    estado: 'ACTIVO',
    icono: 'bike',
    skus: [
      {
        id: 'sku-29384-c',
        sku: 'SKU-29384-C',
        nombre: 'Melón Cantaloupe Extra',
        pesoIdealKg: 1200,
        toleranciaMinPct: 2.5,
        toleranciaMaxPct: 5,
      },
    ],
  },
  {
    id: 'cli-tropical',
    nombre: 'Tropical Fruit Co',
    segmento: 'Distribución Local',
    estado: 'PENDIENTE',
    icono: 'shield',
    skus: [
      {
        id: 'sku-pi-4522',
        sku: 'SKU-PI-4522',
        nombre: 'Piña MD2 Oro',
        pesoIdealKg: 1800,
        toleranciaMinPct: 1,
        toleranciaMaxPct: 1,
      },
    ],
  },
]

export function useParametros() {
  const [clientes] = useState<ClienteParametro[]>(CLIENTES_INICIALES)

  return { clientes }
}
