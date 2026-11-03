import { getInitials } from '#/presentation/components/shared/getInitials'
import {
    DataTable,
    STICKY_ACTIONS_CELL,
    STICKY_ACTIONS_HEADER,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { SoporteRowActions } from '#/presentation/components/soporte/SoporteRowActions'
import { useGetCatalogosUsuarios } from '#/presentation/hooks/catalogos/useGetCatalogosUsuarios'
import type { FiltrosUsuarios } from '#/presentation/schema/soporte/filtrosUsuariosSchema'
import type { CatalogUser } from '#/presentation/types/catalogos/catalogo_response'

const COLUMNS: DataTableColumns<CatalogUser> = [
    {
        id: 'acciones',
        header: 'Acciones',
        meta: {
            align: 'center',
            headerClassName: STICKY_ACTIONS_HEADER,
            cellClassName: `py-2 ${STICKY_ACTIONS_CELL}`,
        },
        cell: ({ row }) => <SoporteRowActions user={row.original} />,
    },
    {
        accessorKey: 'id',
        header: 'ID',
        enableSorting: true,
        meta: { align: 'right', cellClassName: 'w-20 tabular-nums text-text-muted' },
    },
    {
        accessorKey: 'nombre',
        header: 'Nombre',
        enableSorting: true,
        cell: ({ row }) => (
            <span className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand/12 text-[11px] font-black tracking-wide text-brand">
                    {getInitials(row.original.nombre)}
                </span>
                <span className="font-bold text-text-main">{row.original.nombre}</span>
            </span>
        ),
    },
    {
        accessorKey: 'username',
        header: 'Usuario',
        enableSorting: true,
        meta: { cellClassName: 'text-text-muted' },
    },
    {
        accessorKey: 'cedula',
        header: 'Cédula',
        meta: { cellClassName: 'tabular-nums text-text-muted' },
        cell: ({ row }) => row.original.cedula ?? '—',
    },
    {
        accessorKey: 'rol',
        header: 'Rol',
        enableSorting: true,
        cell: ({ row }) => (
            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-text-main">
                {row.original.rol}
            </span>
        ),
    },
]

interface SupportUsersTableProps {
    filtros: FiltrosUsuarios
}

export function SupportUsersTable({ filtros }: SupportUsersTableProps) {
    const { usuarios } = useGetCatalogosUsuarios(filtros)
    const isFiltered = Object.values(filtros).some((valor) => valor !== undefined)

    return (
        <DataTable
            data={usuarios}
            columns={COLUMNS}
            getRowId={(user) => String(user.id)}
            defaultSorting={[{ id: 'nombre', desc: false }]}
            maxHeight="36rem"
            emptyTitle={isFiltered ? 'Ningún usuario coincide' : 'No hay usuarios activos'}
            emptyDescription={
                isFiltered
                    ? 'Probá con otros filtros o limpialos para ver todos los usuarios.'
                    : 'Todavía no se registró ningún usuario en el sistema.'
            }
        />
    )
}
