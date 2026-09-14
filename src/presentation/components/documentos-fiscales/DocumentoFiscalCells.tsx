/**
 * Buena parte de los campos del documento llegan en null; el guión largo los
 * marca sin romper la fila.
 */
export function EmptyValue({ valor }: { valor: string | null }) {
    if (!valor) return <span className="text-text-muted">—</span>

    return <>{valor}</>
}
