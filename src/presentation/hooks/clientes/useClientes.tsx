import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { Cliente } from '#/presentation/types/clientes/clientes.types'

const CLIENTES_INICIALES: Cliente[] = [
    {
        id: 1,
        nombre: 'Agrolibano',
        rtn: '08019995123456',
        producto: 'OCRA',
        codigo_exportacion: 'EXP-HN-2291',
        correo_contacto: 'operaciones@agrolibano.hn',
        telefono: '+504 2782-0100',
        direccion_planta: 'Km 12 Carretera al Sur, Choluteca',
        ubicacionLongitud: '-87.1911',
        ubicacionLatitude: '13.3006',
        created_by: 17,
        created_at: '2026-01-15T10:00:00.000Z',
        updated_at: '2026-01-15T10:00:00.000Z',
    },
    {
        id: 2,
        nombre: 'Tropical Fruit Co',
        rtn: '05019004556677',
        producto: 'OCRA',
        codigo_exportacion: '221',
        correo_contacto: 'planta@tropicalfruit.hn',
        telefono: '+504 2647-3320',
        direccion_planta: 'Zona Industrial El Progreso, Yoro',
        ubicacionLongitud: '-87.8003',
        ubicacionLatitude: '15.4009',
        created_by: 17,
        created_at: '2026-02-03T14:30:00.000Z',
        updated_at: '2026-02-03T14:30:00.000Z',
    },
    {
        id: 3,
        nombre: 'Azucarera La Grecia',
        rtn: '06011998223344',
        producto: 'OCRA',
        codigo_exportacion: '221',
        correo_contacto: null,
        telefono: null,
        direccion_planta: null,
        ubicacionLongitud: null,
        ubicacionLatitude: null,
        created_by: null,
        created_at: null,
        updated_at: null,
    },
]

export function useClientes() {
    const navigate = useNavigate()
    const [clientes] = useState<Cliente[]>(CLIENTES_INICIALES)

    /**
     * El cliente completo viaja en el `state` del historial, no en la URL. Si
     * se pierde (recarga, entrada directa), el guard de `/control-calidad`
     * devuelve al operario a esta pantalla.
     */
    const seleccionarCliente = (cliente: Cliente) => {
        navigate({ to: '/control-calidad', state: { cliente } })
    }

    return { clientes, seleccionarCliente }
}
