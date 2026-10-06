import { useMemo } from 'react'

import { getPlantMockServer } from '#/presentation/hooks/mirador/plantSnapshotMock'
import type { PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'

/**
 * Todos los pesajes de un lote, del más nuevo al más viejo, para el nivel Lote
 * y el nivel Pesaje del Mirador.
 *
 * MOCK: sale de la planta simulada; `version` (el `seq` de la foto) es lo que
 * hace que se relea cuando entra un pesaje. Con el endpoint de la planta, el
 * interior pasa a ser `useGetInspeccionPesajes({ loteId })` —que suspende: el
 * `<Suspense>` vive en `LotPanel`— y `version` sobra, porque esa query se
 * invalida sola con su propio polling.
 */
export function useLotWeighings(lotId: number, version: number): PlantWeighing[] {
    return useMemo(() => getPlantMockServer().lotWeighings(lotId), [lotId, version])
}
