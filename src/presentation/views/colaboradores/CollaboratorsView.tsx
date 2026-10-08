import { CollaboratorRowActions } from '#/presentation/components/colaboradores/CollaboratorRowActions'
import {
    DataTable,
    STICKY_ACTIONS_CELL,
    STICKY_ACTIONS_HEADER,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { useGetCatalogosUsuarios } from '#/presentation/hooks/catalogos/useGetCatalogosUsuarios'
import type { CatalogoData } from '#/presentation/types/catalogos/catalogo_response'

const columns: DataTableColumns<CatalogoData> = [
    {
        id: 'acciones',
        header: 'Acciones',
        meta: {
            align: 'center',
            headerClassName: STICKY_ACTIONS_HEADER,
            cellClassName: `py-2 ${STICKY_ACTIONS_CELL}`,
        },
        cell: ({ row }) => <CollaboratorRowActions usuario={row.original} />,
    },
    {
        accessorKey: 'id',
        header: 'ID',
        enableSorting: true,
        meta: { cellClassName: 'font-bold' },
    },
    {
        accessorKey: 'nombre',
        header: 'Nombre',
        enableSorting: true,
        meta: { cellClassName: 'font-bold' },
    },
]

export function CollaboratorsView() {
    const { usuarios } = useGetCatalogosUsuarios()

    return (
        <DataTable
            data={usuarios}
            columns={columns}
            getRowId={(usuario) => String(usuario.id)}
            defaultSorting={[{ id: 'nombre', desc: false }]}
            maxHeight="32rem"
            emptyTitle="No hay colaboradores"
            emptyDescription="Todavía no se creó ningún usuario."
        />
    )
}
