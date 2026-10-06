import { useMemo } from 'react'

import { useGetInspeccionPesajes } from '#/presentation/hooks/inspeccion-pesajes/useInspeccionPesajes'
import type { PlantWeighing } from '#/presentation/types/mirador/plantTwin.types'
import type { PesajeData } from '#/presentation/types/pesajes/pesajesResponse'

function aPlantWeighing(pesaje: PesajeData): PlantWeighing {
    return {
        id: pesaje.id,
        peso_neto: pesaje.peso_neto,
        fuera_de_rango: pesaje.fuera_de_rango,
        estado_calidad_codigo: pesaje.estado_calidad_codigo,
        usuario: pesaje.usuario,
        created_at: new Date(pesaje.created_at).toISOString(),
    }
}

/**
 * Todos los pesajes activos de un lote (`GET /pesajes/byLote/:loteId`), para el
 * nivel Lote y el nivel Pesaje del Mirador. El backend los ordena por
 * `created_at` DESC, no por `id`.
 *
 * Suspende: lo monta `LotWeighingsLoader`, que tiene su propio `<Suspense>` y
 * `ErrorBoundary` para no cambiar el tablero entero por un spinner. Se vuelve a
 * pedir cuando `usePlantTwin` invalida la query porque la foto trajo un pesaje
 * nuevo o anulado de este lote.
 */
export function useLotWeighings(lotId: number): PlantWeighing[] {
    const { pesajes } = useGetInspeccionPesajes({ loteId: lotId })
    return useMemo(() => pesajes.map(aPlantWeighing), [pesajes])
}
