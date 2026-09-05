
import { ClientRowActions } from '#/presentation/components/inspeccion-clientes/ClientRowActions'
import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'
import { useClientInspection } from '#/presentation/hooks/inspeccion-clientes/useClientInspection'
import type { FiltrosClientes } from '#/presentation/schema/inspeccion-clientes/filtrosClientesSchema'

function Dato({ valor }: { valor: string | null }) {
    if (!valor) return <span className="text-text-muted">—</span>

    return <>{valor}</>
}


function crearColumnas(
): DataTableColumns<Cliente> {
    return [
        {
            id: 'acciones',
            header: 'Acciones',
            meta: { align: 'center', cellClassName: 'py-2' },
            cell: ({ row }) => (
                <ClientRowActions
                    cliente={row.original}
                />
            ),
        },
        {
            accessorKey: 'id',
            header: 'ID',
            meta: { cellClassName: 'font-bold' },
        },
        {
            accessorKey: 'nombre',
            header: 'Cliente',
            enableSorting: true,
            meta: { cellClassName: 'font-bold' },
        },
        {
            accessorKey: 'producto',
            header: 'Producto',
            enableSorting: true,
            cell: ({ row }) => <Dato valor={row.original.producto} />,
        },
        {
            accessorKey: 'codigo_exportacion',
            header: 'Código exportación',
            enableSorting: true,
            cell: ({ row }) => <Dato valor={row.original.codigo_exportacion} />,
        },
        {
            accessorKey: 'telefono',
            header: 'Teléfono',
            cell: ({ row }) => <Dato valor={row.original.telefono} />,
        },
        {
            accessorKey: 'direccion_planta',
            header: 'Planta',
            cell: ({ row }) => <Dato valor={row.original.direccion_planta} />,
        },
    ]
}

interface ClientInspectionViewProps {
    filtros: FiltrosClientes
}

export function ClientInspectionView({ filtros }: ClientInspectionViewProps) {
    const { clientes } = useClientInspection(filtros)

    const columns = crearColumnas();

    return (
        <DataTable
            data={clientes}
            columns={columns}
            getRowId={(cliente) => String(cliente.id)}
            defaultSorting={[{ id: 'nombre', desc: false }]}
            maxHeight="32rem"
            emptyTitle="No hay clientes para inspeccionar"
            emptyDescription="Todavía no hay datos cargados para esta pantalla."
        />
    )
}
