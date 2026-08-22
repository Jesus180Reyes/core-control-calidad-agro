export function ClientesVacio() {
    return (
        <div className="border border-dashed border-border-ui rounded-[28px] p-12 text-center space-y-2">
            <p className="text-text-main font-bold">
                No hay clientes asignados
            </p>
            <p className="text-sm text-text-muted">
                Pedí a un supervisor que te vincule al menos un cliente para poder pesar.
            </p>
        </div>
    )
}
