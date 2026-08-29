
export const PERMISSIONS = {
    MODULOCONTROLCALIDAD: 'MODULO-CONTROL-CALIDAD',
    MODULOCLIENTES: 'MODULO-CLIENTES',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const CONOCIDOS: ReadonlySet<string> = new Set(Object.values(PERMISSIONS))

export function advertirPermisosDesconocidos(permisos: string[]): void {
    if (!import.meta.env.DEV) return

    const desconocidos = permisos.filter((permiso) => !CONOCIDOS.has(permiso))
    if (desconocidos.length === 0) return

    console.warn(
        `[permisos] El backend devolvió permisos que no están en PERMISSIONS: ${desconocidos.join(', ')}. ` +
        'Agregalos a permissions.ts para poder consultarlos con has().',
    )
}
