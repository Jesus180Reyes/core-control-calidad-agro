import {
    RECENT_WINDOW,
    type PlantClient,
    type PlantSnapshotResponse,
    type PlantStage,
    type PlantWeighing,
} from '#/presentation/types/mirador/plantTwin.types'

/**
 * MOCK de `GET /plantas/en-vivo` mientras el endpoint no exista (SPEC 13).
 *
 * Simula una planta que trabaja: cada pocos segundos entra un pesaje, de vez en
 * cuando un lote cambia de etapa, se abre uno nuevo o un contenedor sale. La
 * foto que devuelve tiene la forma exacta del contrato, así el diff, los slots
 * y la escena se desarrollan contra lo mismo que va a mandar el backend.
 *
 * Se borra entero cuando exista el endpoint: nada fuera de `usePlantTwin` y
 * `useLotWeighings` lo importa.
 */

interface Producto {
    nombre: string
    unidad: string
    min: number
    ideal: number
    max: number
    /** Dispersión típica del peso, en kg. */
    sd: number
}

const PRODUCTOS = {
    cafe: { nombre: 'Café oro', unidad: 'kg', min: 68.6, ideal: 69.0, max: 69.5, sd: 0.17 },
    melon: { nombre: 'Melón cantaloupe', unidad: 'kg', min: 17.9, ideal: 18.2, max: 18.6, sd: 0.13 },
    cacao: { nombre: 'Cacao seco', unidad: 'kg', min: 59.5, ideal: 60.0, max: 60.6, sd: 0.21 },
    pina: { nombre: 'Piña MD-2', unidad: 'kg', min: 11.8, ideal: 12.1, max: 12.5, sd: 0.12 },
    platano: { nombre: 'Plátano verde', unidad: 'kg', min: 22.4, ideal: 22.7, max: 23.1, sd: 0.14 },
} satisfies Record<string, Producto>

type ClaveProducto = keyof typeof PRODUCTOS

const OPERARIOS = ['M. Castillo', 'J. Ramírez', 'A. Flores', 'D. Mejía']

const CLIENTES_INICIALES: { id: number; nombre: string; prod: ClaveProducto; codigo: string | null; plan: PlantStage[] }[] = [
    { id: 101, nombre: 'Beneficio Montaña Azul', prod: 'cafe', codigo: 'EXP-0142', plan: ['en-pesaje', 'en-pesaje', 'por-aprobar', 'finalizado'] },
    { id: 102, nombre: 'Agroexport del Valle', prod: 'melon', codigo: 'EXP-0087', plan: ['en-pesaje', 'por-aprobar', 'por-aprobar', 'finalizado', 'finalizado'] },
    { id: 103, nombre: 'Cooperativa Los Cedros', prod: 'cacao', codigo: 'EXP-0211', plan: ['en-pesaje', 'en-pesaje', 'finalizado'] },
    { id: 104, nombre: 'Frutas del Litoral', prod: 'pina', codigo: 'EXP-0156', plan: ['en-pesaje', 'por-aprobar', 'finalizado'] },
    { id: 105, nombre: 'Finca El Roble', prod: 'platano', codigo: null, plan: ['finalizado'] },
]

interface MockPesaje {
    id: number
    peso: number
    usuario: string
    at: number
}

interface MockLote {
    id: number
    nombre: string
    prod: ClaveProducto
    etapa: PlantStage
    /** Corrimiento propio del lote: algunos vienen cargados hacia un lado. */
    sesgo: number
    pesajes: MockPesaje[]
}

interface MockCliente {
    id: number
    nombre: string
    prod: ClaveProducto
    codigo: string | null
    lotes: MockLote[]
}

const CAPACIDAD: Record<Exclude<PlantStage, 'rechazado'>, number> = { 'en-pesaje': 4, 'por-aprobar': 4, 'finalizado': 2 }

export class PlantMockServer {
    private semilla = 20261005
    private clientes: MockCliente[] = []
    private pesajeSeq = 45100
    private loteSeq = 900
    private loteNum = 6
    private reloj: number
    private proximoPesaje: number
    private proximaEtapa: number
    private readonly inicioDelDia: number
    private readonly prefijo: string

    constructor(ahora = Date.now()) {
        const d = new Date(ahora)
        this.inicioDelDia = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        this.prefijo = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0')
        this.reloj = ahora
        this.proximoPesaje = ahora + 2500
        this.proximaEtapa = ahora + 16000

        for (const base of CLIENTES_INICIALES) {
            const cliente: MockCliente = { id: base.id, nombre: base.nombre, prod: base.prod, codigo: base.codigo, lotes: [] }
            for (const etapa of base.plan) {
                const n = etapa === 'en-pesaje' ? 6 + this.entero(20) : etapa === 'por-aprobar' ? 30 + this.entero(16) : 36 + this.entero(22)
                const edad = etapa === 'en-pesaje' || etapa === 'por-aprobar' ? 0 : (2 + this.rnd() * 2) * 86400e3
                this.crearLote(cliente, etapa, n, ahora - edad)
            }
            this.clientes.push(cliente)
        }
    }

    /** La foto de la planta al momento `ahora`, avanzando la simulación hasta ahí. */
    snapshot(ahora = Date.now()): PlantSnapshotResponse {
        this.avanzar(ahora)

        const clientes: PlantClient[] = this.clientes
            .filter((c) => c.lotes.length > 0)
            .map((c) => ({
                id: c.id,
                nombre: c.nombre,
                producto: PRODUCTOS[c.prod].nombre,
                codigo_exportacion: c.codigo,
                lotes: c.lotes.map((l) => {
                    const p = PRODUCTOS[l.prod]
                    return {
                        id: l.id,
                        nombre_lote: l.nombre,
                        producto: p.nombre,
                        unidad_medida: p.unidad,
                        etapa: l.etapa,
                        peso_minimo: p.min.toFixed(2),
                        peso_ideal: p.ideal.toFixed(2),
                        peso_maximo: p.max.toFixed(2),
                        bultos: l.pesajes.length,
                        bultos_fuera_rango: l.pesajes.filter((x) => this.fuera(l, x.peso)).length,
                        peso_neto_total: Math.round(l.pesajes.reduce((s, x) => s + x.peso, 0) * 100) / 100,
                        ultimos_pesajes: l.pesajes.slice(-RECENT_WINDOW).reverse().map((x) => this.aPesaje(l, x)),
                    }
                }),
            }))

        const hoy = this.clientes.flatMap((c) => c.lotes.flatMap((l) => l.pesajes.filter((x) => x.at >= this.inicioDelDia).map((x) => ({ l, x }))))
        const enRango = hoy.filter(({ l, x }) => !this.fuera(l, x.peso)).length
        const lotes = this.clientes.flatMap((c) => c.lotes)

        return {
            ok: true,
            msg: 'Planta en vivo (datos de ejemplo)',
            planta: {
                generado_en: new Date(ahora).toISOString(),
                kpis: {
                    pesajes_hoy: hoy.length,
                    peso_neto_hoy: Math.round(hoy.reduce((s, { x }) => s + x.peso, 0) * 100) / 100,
                    pct_en_rango_hoy: hoy.length ? (enRango / hoy.length) * 100 : null,
                    lotes_activos: lotes.filter((l) => l.etapa === 'en-pesaje' || l.etapa === 'por-aprobar').length,
                    clientes_con_actividad_hoy: this.clientes.filter((c) => c.lotes.some((l) => l.pesajes.some((x) => x.at >= this.inicioDelDia))).length,
                },
                clientes,
            },
        }
    }

    /** Todos los pesajes del lote, del más nuevo al más viejo: lo que hoy da `GET /pesajes/byLote/:id`. */
    lotWeighings(lotId: number): PlantWeighing[] {
        for (const c of this.clientes) {
            const l = c.lotes.find((x) => x.id === lotId)
            if (l) return l.pesajes.slice().reverse().map((x) => this.aPesaje(l, x))
        }
        return []
    }

    // ---------------------------------------------------------------- simulación

    private avanzar(ahora: number) {
        // Con la pestaña dormida mucho rato no se recupera todo: un minuto alcanza para que se note.
        if (ahora - this.reloj > 5 * 60e3) {
            this.proximoPesaje = Math.max(this.proximoPesaje, ahora - 60e3)
            this.proximaEtapa = Math.max(this.proximaEtapa, ahora - 60e3)
        }
        while (this.proximoPesaje <= ahora) {
            this.pesar(this.proximoPesaje)
            this.proximoPesaje += 2600 + this.rnd() * 2600
        }
        while (this.proximaEtapa <= ahora) {
            this.moverAlgo()
            this.proximaEtapa += 16000 + this.rnd() * 10000
        }
        this.reloj = ahora
    }

    private pesar(at: number) {
        const candidatos = this.clientes.flatMap((c) => c.lotes.filter((l) => l.etapa === 'en-pesaje'))
        if (!candidatos.length) return
        const lote = candidatos[this.entero(candidatos.length)]
        lote.pesajes.push(this.nuevoPesaje(lote, at))
    }

    private moverAlgo() {
        const acciones: (() => void)[] = []
        for (const c of this.clientes) {
            const de = (etapa: PlantStage) => c.lotes.filter((l) => l.etapa === etapa)
            const hayLugar = (etapa: Exclude<PlantStage, 'rechazado'>) => de(etapa).length < CAPACIDAD[etapa]

            if (de('por-aprobar').length && !hayLugar('finalizado')) {
                const masViejo = de('finalizado')[0]
                if (masViejo) acciones.push(() => { c.lotes.splice(c.lotes.indexOf(masViejo), 1) })
            }
            for (const l of de('por-aprobar')) {
                if (hayLugar('finalizado')) acciones.push(() => { l.etapa = 'finalizado' })
            }
            for (const l of de('en-pesaje')) if (l.pesajes.length >= 26 && hayLugar('por-aprobar')) acciones.push(() => { l.etapa = 'por-aprobar' })
            if (de('en-pesaje').length < 2 && hayLugar('en-pesaje')) acciones.push(() => this.crearLote(c, 'en-pesaje', 0, this.reloj))
        }
        if (acciones.length) acciones[this.entero(acciones.length)]()
    }

    private crearLote(cliente: MockCliente, etapa: PlantStage, n: number, hasta: number) {
        const lote: MockLote = {
            id: ++this.loteSeq,
            nombre: `L-${this.prefijo}-${String(this.loteNum++).padStart(2, '0')}`,
            prod: cliente.prod,
            etapa,
            sesgo: this.gauss() * PRODUCTOS[cliente.prod].sd * 0.45,
            pesajes: [],
        }
        const desdeMedianoche = Math.max(30 * 60e3, hasta - this.inicioDelDia - 5 * 60e3)
        const lapso = etapa === 'en-pesaje' || etapa === 'por-aprobar' ? Math.min(4.5 * 3600e3, desdeMedianoche) : 6 * 3600e3
        for (let k = 0; k < n; k++) lote.pesajes.push(this.nuevoPesaje(lote, hasta - lapso + (lapso * k) / Math.max(1, n)))
        cliente.lotes.push(lote)
    }

    private nuevoPesaje(lote: MockLote, at: number): MockPesaje {
        const p = PRODUCTOS[lote.prod]
        let peso = p.ideal + this.gauss() * p.sd + lote.sesgo
        if (this.rnd() < 0.04) peso += (this.rnd() < 0.5 ? -1 : 1) * (p.max - p.ideal) * (1.25 + this.rnd() * 0.5)
        return { id: ++this.pesajeSeq, peso: Math.round(peso * 100) / 100, usuario: OPERARIOS[this.entero(OPERARIOS.length)], at }
    }

    private fuera(lote: MockLote, peso: number) {
        const p = PRODUCTOS[lote.prod]
        return peso < p.min || peso > p.max
    }

    private aPesaje(lote: MockLote, x: MockPesaje): PlantWeighing {
        const fuera = this.fuera(lote, x.peso)
        return {
            id: x.id,
            peso_neto: x.peso.toFixed(2),
            fuera_de_rango: fuera,
            estado_calidad_codigo: !fuera ? 'IDEAL' : x.peso < PRODUCTOS[lote.prod].min ? 'MINIMO' : 'MAXIMO',
            usuario: x.usuario,
            created_at: new Date(x.at).toISOString(),
        }
    }

    // ------------------------------------------------------------ azar sembrado

    private rnd() {
        this.semilla = (this.semilla * 1664525 + 1013904223) >>> 0
        return this.semilla / 4294967296
    }

    private entero(n: number) {
        return Math.floor(this.rnd() * n)
    }

    private gauss() {
        let u = 0
        let v = 0
        while (!u) u = this.rnd()
        while (!v) v = this.rnd()
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    }
}

let servidor: PlantMockServer | null = null

/** Una sola planta simulada por pestaña, compartida por la foto y el detalle del lote. */
export function getPlantMockServer(): PlantMockServer {
    return (servidor ??= new PlantMockServer())
}
