import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, type BufferGeometry, type Material, type Object3D } from 'three'

import { slab } from './geometry'

/**
 * Personas, camiones y carritos del Mirador. Colores fijos a propósito: los
 * chalecos reflectivos y los cascos se ven igual de día y de noche.
 */

const materiales = new Map<string, MeshStandardMaterial>()

export function fixedMaterial(color: string, roughness = 0.7, emissive?: string): MeshStandardMaterial {
    const clave = `${color}|${roughness}|${emissive ?? ''}`
    let m = materiales.get(clave)
    if (!m) {
        m = new MeshStandardMaterial({ color, roughness, metalness: 0 })
        if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = 0.9 }
        materiales.set(clave, m)
    }
    return m
}

export function disposeFigureMaterials() {
    materiales.forEach((m) => m.dispose())
    materiales.clear()
}

export function addMesh(parent: Object3D, geometry: BufferGeometry, material: Material | Material[], x = 0, y = 0, z = 0, castShadow = true): Mesh {
    const m = new Mesh(geometry, material)
    m.position.set(x, y, z)
    m.castShadow = castShadow
    m.receiveShadow = true
    parent.add(m)
    return m
}

export const SKIN = ['#E8BC94', '#C99366', '#8E5B3C', '#F2CDA8', '#A86F4A']

const PG = {
    leg: new BoxGeometry(0.1, 0.38, 0.12).translate(0, -0.19, 0),
    arm: new BoxGeometry(0.075, 0.32, 0.085).translate(0, -0.16, 0),
    hand: new SphereGeometry(0.045, 10, 8),
    torso: new CylinderGeometry(0.15, 0.18, 0.42, 14),
    stripe: new CylinderGeometry(0.163, 0.172, 0.035, 14),
    head: new SphereGeometry(0.12, 18, 14),
    hat: new SphereGeometry(0.134, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
    brim: new CylinderGeometry(0.175, 0.175, 0.016, 20),
    board: new BoxGeometry(0.17, 0.22, 0.015),
    sack: new BoxGeometry(0.3, 0.2, 0.2),
    wheel: new CylinderGeometry(0.24, 0.24, 0.18, 18),
    caster: new CylinderGeometry(0.065, 0.065, 0.05, 12),
    box: new BoxGeometry(0.24, 0.19, 0.28),
    bag: new BoxGeometry(0.26, 0.14, 0.22),
}

export interface Person {
    root: Group
    body: Group
    legL: Group
    legR: Group
    armL: Group
    armR: Group
    phase: number
    carrying: boolean
    pushing: boolean
    /** Segundos que le quedan al gesto de recibir un bulto. */
    action: number
}

interface PersonOptions {
    vest: string
    hat: string
    skin: string
    pants?: string
    clipboard?: boolean
    sack?: boolean
    phase?: number
}

export function createPerson({ vest, hat, skin, pants = '#2E3A4A', clipboard = false, sack = false, phase = 0 }: PersonOptions): Person {
    const root = new Group()
    const hip = 0.4
    const pierna = (x: number) => {
        const g = new Group(); g.position.set(x, hip, 0); root.add(g)
        addMesh(g, PG.leg, fixedMaterial(pants)); return g
    }
    const legL = pierna(-0.065)
    const legR = pierna(0.065)
    const body = new Group(); root.add(body)
    addMesh(body, PG.torso, fixedMaterial(vest, 0.55), 0, hip + 0.21, 0)
    addMesh(body, PG.stripe, fixedMaterial('#EEF2F3', 0.25), 0, hip + 0.15, 0)
    const brazo = (x: number) => {
        const g = new Group(); g.position.set(x, hip + 0.39, 0); body.add(g)
        addMesh(g, PG.arm, fixedMaterial(vest, 0.55)); addMesh(g, PG.hand, fixedMaterial(skin), 0, -0.33, 0); return g
    }
    const armL = brazo(-0.205)
    const armR = brazo(0.205)
    addMesh(body, PG.head, fixedMaterial(skin, 0.6), 0, hip + 0.57, 0)
    addMesh(body, PG.hat, fixedMaterial(hat, 0.35), 0, hip + 0.6, 0)
    addMesh(body, PG.brim, fixedMaterial(hat, 0.35), 0, hip + 0.6, 0.025)
    if (clipboard) { const t = addMesh(armR, PG.board, fixedMaterial('#C9A46A', 0.8), -0.02, -0.3, 0.1); t.rotation.x = -0.35 }
    if (sack) addMesh(body, PG.sack, fixedMaterial('#D9C7A0', 0.95), 0, hip + 0.22, 0.2)
    root.scale.setScalar(1.08)
    return { root, body, legL, legR, armL, armR, phase, carrying: sack, pushing: false, action: 0 }
}

/** Paso de caminata; con `amount` en 0 queda parado. */
export function walkPose(p: Person, time: number, amount: number) {
    const fase = time * 9 + p.phase
    const s = Math.sin(fase) * 0.62 * amount
    p.legL.rotation.x = s
    p.legR.rotation.x = -s
    if (p.pushing) { p.armL.rotation.x = p.armR.rotation.x = -1.2 }
    else if (p.carrying) { p.armL.rotation.x = p.armR.rotation.x = -1.15 }
    else { p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8 }
    p.body.position.y = Math.abs(Math.cos(fase)) * 0.028 * amount
}

export interface Truck {
    root: Group
    wheels: Mesh[]
}

/** Camión de plataforma con la cabina hacia `+x`; la franja lleva el color del cliente. */
export function createTruck(color: string): Truck {
    const root = new Group()
    const wheels: Mesh[] = []
    addMesh(root, new BoxGeometry(2.7, 0.16, 0.86), fixedMaterial('#2B3036', 0.6), 0, 0.34, 0)
    for (const x of [-1.0, -0.42, 0.92]) {
        for (const z of [-0.5, 0.5]) {
            const w = addMesh(root, PG.wheel, fixedMaterial('#1B1F23', 0.85), x, 0.24, z)
            w.rotation.x = Math.PI / 2
            wheels.push(w)
        }
    }
    addMesh(root, slab(0.92, 1.0, 1.16, 0.16, 0.05), fixedMaterial('#F2F4F3', 0.4), 0.92, 0.42, 0)
    addMesh(root, new BoxGeometry(0.03, 0.4, 0.98), fixedMaterial('#1D2A33', 0.15), 1.385, 1.0, 0)
    addMesh(root, new BoxGeometry(0.52, 0.32, 1.18), fixedMaterial('#1D2A33', 0.15), 0.96, 1.02, 0)
    addMesh(root, new BoxGeometry(0.93, 0.09, 1.175), fixedMaterial(color, 0.5), 0.92, 0.64, 0)
    for (const z of [-0.4, 0.4]) addMesh(root, new BoxGeometry(0.03, 0.1, 0.18), fixedMaterial('#FFF3C4', 0.3, '#FFE7A0'), 1.39, 0.6, z)
    addMesh(root, slab(1.78, 0.1, 1.16, 0.05, 0.02), fixedMaterial('#8B959B', 0.6), -0.5, 0.42, 0)
    return { root, wheels }
}

/** Carrito de picking: dos repisas con cajas y sacos, la manija atrás (`-z`). */
export function createCart(accent: string): Group {
    const g = new Group()
    const metal = fixedMaterial('#5E6A73', 0.45)
    addMesh(g, slab(0.62, 0.05, 0.86, 0.06, 0.015), metal, 0, 0.17, 0)
    addMesh(g, slab(0.62, 0.04, 0.86, 0.06, 0.012), metal, 0, 0.5, 0)
    for (const [x, z] of [[-0.28, -0.4], [0.28, -0.4], [-0.28, 0.4], [0.28, 0.4]]) addMesh(g, new BoxGeometry(0.03, 0.36, 0.03), metal, x, 0.36, z)
    for (const x of [-0.27, 0.27]) addMesh(g, new BoxGeometry(0.03, 0.62, 0.03), metal, x, 0.48, -0.43)
    addMesh(g, new BoxGeometry(0.6, 0.035, 0.035), fixedMaterial(accent, 0.5), 0, 0.79, -0.43)
    for (const [x, z] of [[-0.24, -0.33], [0.24, -0.33], [-0.24, 0.33], [0.24, 0.33]]) {
        const w = addMesh(g, PG.caster, fixedMaterial('#1B1F23', 0.85), x, 0.075, z)
        w.rotation.z = Math.PI / 2
    }
    addMesh(g, PG.box, fixedMaterial('#C9A26B', 0.9), -0.14, 0.315, 0.18)
    addMesh(g, PG.box, fixedMaterial('#B8915C', 0.9), 0.14, 0.315, -0.12)
    addMesh(g, PG.bag, fixedMaterial('#D9C7A0', 0.95), -0.13, 0.59, -0.16)
    addMesh(g, PG.bag, fixedMaterial('#E2D3B1', 0.95), 0.13, 0.59, 0.14)
    addMesh(g, PG.bag, fixedMaterial('#D3BF94', 0.95), 0, 0.73, 0)
    return g
}
