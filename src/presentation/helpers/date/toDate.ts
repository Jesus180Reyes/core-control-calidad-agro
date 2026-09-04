/**
 * Normaliza cualquier fecha que circule por la app a un `Date` usable.
 *
 * Un mismo campo llega en tres formas según por dónde entre: el `Date` que
 * guarda el `ControlledDatePicker`, el string ISO con el que el API contesta
 * (`created_at` está tipado `Date` pero viaja como string en el JSON) y el
 * vacío de un filtro sin tocar. Una fecha inválida cuenta como vacío: `undefined`
 * es lo que el resto de los helpers sabe manejar, `Invalid Date` no.
 */
export function toDate(valor: unknown): Date | undefined {
    if (valor == null || valor === '') return undefined

    const fecha = valor instanceof Date ? valor : new Date(valor as string | number)

    return Number.isNaN(fecha.getTime()) ? undefined : fecha
}
