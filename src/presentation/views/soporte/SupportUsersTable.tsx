import { getInitials } from '#/presentation/components/shared/getInitials'
import {
    DataTable,
    STICKY_ACTIONS_CELL,
    STICKY_ACTIONS_HEADER,
    type DataTableColumns,
} from '#/presentation/components/shared/table/DataTable'
import { SoporteRowActions } from '#/presentation/components/soporte/SoporteRowActions'
import { useSupportUsers } from '#/presentation/hooks/soporte/useSupportUsers'
import type { CatalogoData } from '#/presentation/types/catalogos/catalogo_response'

const COLUMNS: DataTableColumns<CatalogoData> = [
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
]

/** La tabla de usuarios activos de `/soporte`. Suspende mientras carga. */
export function SupportUsersTable() {
    const { users } = useSupportUsers()

    return (
        <DataTable
            data={users}
            columns={COLUMNS}
            getRowId={(user) => String(user.id)}
            defaultSorting={[{ id: 'nombre', desc: false }]}
            maxHeight="36rem"
            emptyTitle="No hay usuarios activos"
            emptyDescription="Todavía no se registró ningún usuario en el sistema."
        />
    )
}
