
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

const SIN_CLIENTES: Cliente[] = [
    {
        id: 1,
        nombre: 'AgroExport S.A.',
        producto: 'Producto AgroExport S.A.',
        codigo_exportacion: '12345678',
        telefono: '+56 987 654321',
        direccion_planta: 'Calle 123, 123 123 123, 1234 Ciudad, Estado',
    },

]

export function useClientInspection() {

    return { clientes: SIN_CLIENTES }
}
