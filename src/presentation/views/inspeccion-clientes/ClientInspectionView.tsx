import {
    DataTable,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { useClientInspection } from '#/presentation/hooks/inspeccion-clientes/useClientInspection'
import type { Cliente } from '#/presentation/types/clientes/clientes.types'

/** Los campos del cliente son nullables: sin dato, un guión apagado. */
function Dato({ valor }: { valor: string | null }) {
    if (!valor) return <span className="text-text-muted">—</span>

    return <>{valor}</>
}

const columns: DataTableColumns<Cliente> = [
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

export function ClientInspectionView() {
    const { clientes } = useClientInspection()

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
