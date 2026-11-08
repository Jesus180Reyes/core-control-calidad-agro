import type { WeightUnit } from '#/presentation/types/control-calidad/perfil-bascula.types'

const LOT_UNITS: Record<string, WeightUnit> = {
    KG: 'kg',
    KGS: 'kg',
    KILO: 'kg',
    KILOS: 'kg',
    KILOGRAMO: 'kg',
    KILOGRAMOS: 'kg',
    LB: 'lb',
    LBS: 'lb',
    LIBRA: 'lb',
    LIBRAS: 'lb',
    G: 'g',
    GR: 'g',
    GRS: 'g',
    GRAMO: 'g',
    GRAMOS: 'g',
    OZ: 'oz',
    ONZA: 'oz',
    ONZAS: 'oz',
}

const normalize = (text: string): string =>
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s]/g, '').toUpperCase()

export const unitFromLote = (unidadMedida: string | null | undefined): WeightUnit | null => {
    if (!unidadMedida) return null
    return LOT_UNITS[normalize(unidadMedida)] ?? null
}

export const isUnitMismatch = (leida: WeightUnit | null, lote: WeightUnit | null): boolean =>
    leida !== null && lote !== null && leida !== lote
