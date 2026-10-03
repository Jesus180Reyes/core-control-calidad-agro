
// Clave hermana que el backend agrega solo cuando se pide `pagina` o `limite` (SPEC 29 del backend).
export interface Paginacion {
    pagina: number
    limite: number
    total: number
    total_paginas: number
}

// Filas por página de las tablas paginadas. Viaja explícito como `limite`.
export const TAMANO_PAGINA = 20
