import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { clientColor, clientInitials } from '#/presentation/components/mirador/clientColors'
import { qualityLevel, targetPoint } from '#/presentation/hooks/mirador/qualityTarget'
import {
    ACTIVE_STAGES,
    STAGE_LABEL,
    type ActiveStage,
    type PlantClient,
    type PlantEvent,
    type PlantLot,
    type PlantPickTarget,
    type PlantSelection,
    type PlantSnapshot,
    type PlantWeighing,
    type QualityLevel,
    type SlotMap,
} from '#/presentation/types/mirador/plantTwin.types'

import { addMesh, createCart, createPerson, createTruck, disposeFigureMaterials, SKIN, walkPose, type Person, type Truck } from './figures'
import { chipGeometry, disposeGeometryCache, slab } from './geometry'
import {
    BOARD_X0, BOARD_X1, CAP_IN, CAP_OUT, CHIP_H, RED_STACK, ROW, SCALE_X, SLOT_OFFSETS, STACKS, STAGE_INDEX, STRIP_X0, STRIP_X1,
    TERR_D, TERR_TOP, TILE_D, TILE_TOP, TILE_W, TILE_X, rowZ, slotPosition,
} from './layout'
import { readPalette, type ScenePalette } from './palette'

/**
 * El tablero 3D del Mirador. Vive fuera de React a propósito: tiene su propio
 * `requestAnimationFrame` y React sólo le pasa la foto, los slots, los eventos
 * y la selección por métodos. Meter algo de esto en un `useState` re-renderiza
 * 60 veces por segundo.
 *
 * Regla de oro: lo que representa datos sólo se mueve por un evento del diff.
 * La gente de los pasillos, los carritos y el operario son ambientación.
 */

export interface PlantSceneCallbacks {
    onPick: (target: PlantPickTarget | null) => void
}

export interface SceneInsets {
    /** Lo que tapa el HUD de arriba. */
    top: number
    right: number
    bottom: number
}

interface Label {
    el: HTMLDivElement
    pos: () => THREE.Vector3
    show: boolean
}

interface ClientVisual {
    id: number
    data: PlantClient
    row: number
    color: string
    group: THREE.Group
    picks: THREE.Object3D[]
    topMat: THREE.MeshStandardMaterial
    sideMat: THREE.MeshStandardMaterial
    contMat: THREE.MeshStandardMaterial
    ribMat: THREE.MeshStandardMaterial
    flowMat: THREE.MeshBasicMaterial
    flow: THREE.Mesh | null
    label: Label
    overflow: Map<ActiveStage, Label>
    theme: Themed
}

interface LotPerson {
    person: Person
    kind: 'estibador' | 'supervisor' | 'cargador'
}

interface LotVisual {
    id: number
    clientId: number
    data: PlantLot
    stage: ActiveStage
    slot: number
    row: number
    group: THREE.Group
    base: THREE.Mesh
    stacks: THREE.Group
    status: THREE.Group
    picks: THREE.Object3D[]
    tokens: Map<number, THREE.Mesh>
    pulse: THREE.Mesh | null
    spin: THREE.Mesh | null
    people: LotPerson[]
    truck: Truck | null
    container: THREE.Group | null
    topY: number
    label: Label
    /** Pesajes que todavía están volando: no se dibujan en la pila hasta que aterrizan. */
    pending: Set<number>
    moving: boolean
}

interface Tween {
    t: number
    dur: number
    fn: (p: number) => void
    done?: () => void
}

interface Walker {
    person: Person
    z: number
    x: number
    dir: number
    speed: number
    wait: number
}

interface Pusher {
    person: Person
    root: THREE.Group
    points: THREE.Vector3[]
    index: number
    wait: number
    speed: number
    pos: THREE.Vector3
}

type Themed = (p: ScenePalette) => void

const V3 = THREE.Vector3
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeBack = (t: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const nf0 = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Más de esto por foto se aplica sin animar: la escena nunca se atrasa respecto del dato. */
const MAX_VUELOS = 6
const ESPACIO_VUELOS = 1.15

const CLASES = {
    cliente: 'pointer-events-auto cursor-pointer flex items-center gap-2.5 rounded-2xl border border-border-ui/80 bg-surface/95 py-1.5 pl-1.5 pr-3 shadow-clay-card backdrop-blur transition-opacity duration-200',
    lote: 'pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-full border border-border-ui/80 bg-surface/95 px-2 py-0.5 text-[11px] text-text-main shadow-sm transition-opacity duration-200',
    loteActivo: '!bg-primary !text-primary-foreground !border-transparent',
    exceso: 'pointer-events-none rounded-full bg-text-main/80 px-2 py-0.5 text-[10px] font-bold text-surface transition-opacity duration-200',
    visor: 'pointer-events-none min-w-[196px] rounded-xl border border-[#A8F6C6]/20 bg-[#0C1611] px-3 pt-2 pb-2.5 text-[#A8F6C6] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-opacity duration-200',
}

const PUNTO_VISOR: Record<QualityLevel | 'busy' | 'idle', string> = {
    idle: 'bg-[#3F5C4B]',
    busy: 'bg-[#FFD24A] shadow-[0_0_8px_#FFD24A]',
    ok: 'bg-[#5BE08B] shadow-[0_0_8px_#5BE08B]',
    desviado: 'bg-[#FFC24A] shadow-[0_0_8px_#FFC24A]',
    fuera: 'bg-[#FF6A55] shadow-[0_0_8px_#FF6A55]',
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

export class PlantScene {
    private readonly renderer: THREE.WebGLRenderer
    private readonly scene = new THREE.Scene()
    private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900)
    private readonly host: HTMLElement
    private readonly labelsLayer: HTMLElement
    private readonly callbacks: PlantSceneCallbacks
    private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    private palette: ScenePalette = readPalette()
    private readonly themed = new Set<Themed>()

    private readonly hemi = new THREE.HemisphereLight(0xffffff, 0xbbbbbb, 1.8)
    private readonly sun = new THREE.DirectionalLight(0xffffff, 1.9)
    private readonly rim = new THREE.DirectionalLight(0xbfd8ff, 0.6)
    private readonly flyLight = new THREE.PointLight(0xffffff, 0, 10, 2)
    private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>
    private envTexture: THREE.Texture | null = null

    private readonly M: Record<string, THREE.MeshStandardMaterial>
    private readonly B: Record<string, THREE.MeshBasicMaterial>
    private readonly tileLabelMats: THREE.MeshBasicMaterial[]
    private readonly flowTexture: THREE.CanvasTexture

    private board: THREE.Mesh | null = null
    private readonly station = new THREE.Group()
    private readonly stationRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
    private readonly platform: THREE.Mesh
    private readonly operario: Person
    private readonly ayudante: Person
    private readonly ambient = new THREE.Group()
    private walkers: Walker[] = []
    private pushers: Pusher[] = []
    private chatters: Person[] = []
    private layoutKey = ''
    private minRow = 0
    private maxRow = 0

    private readonly clients = new Map<number, ClientVisual>()
    private readonly lots = new Map<number, LotVisual>()
    private snapshot: PlantSnapshot | null = null
    private seq = -1

    private readonly labels: Label[] = []
    private readonly lcdLabel: Label
    private lcd = { status: 'Esperando bulto', level: 'idle' as QualityLevel | 'busy' | 'idle', value: null as number | null, user: '—', lot: '', unit: 'kg' }

    private selection: PlantSelection = { clientId: null, lotId: null, weighingId: null }
    private selectionWeighings: PlantWeighing[] = []
    private readonly selRing: THREE.Mesh
    private readonly diana = new THREE.Group()
    private readonly dianaTilt = new THREE.Group()
    private readonly dianaDots = new THREE.Group()
    private readonly dianaStem: THREE.Mesh
    private highlighted: THREE.Mesh | null = null

    private readonly tweens: Tween[] = []
    private readonly ripples: { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; t: number }[] = []
    private readonly trail: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = []
    private readonly weighQueue: { lotId: number; weighing: PlantWeighing }[] = []
    private nextWeighAt = 0

    private readonly cam = { target: new V3(9, 0, 17), theta: 0.5, el: 0.82, r: 90 }
    private readonly goal = { target: new V3(9, 0, 17), theta: 0.5, el: 0.82, r: 90 }
    private insets: SceneInsets = { top: 0, right: 0, bottom: 0 }
    private width = 1
    private height = 1
    private introDone: boolean
    private hoverClientId: number | null = null
    private hoverEvent: PointerEvent | null = null
    private readonly pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>()
    private moved = false
    private panMode = false
    private pinch = { d0: 0, r0: 0, mid: { x: 0, y: 0 } }
    private readonly raycaster = new THREE.Raycaster()
    private readonly ndc = new THREE.Vector2()
    private raf = 0
    private running = false
    private time = 0
    private last = 0
    private readonly resizeObserver: ResizeObserver
    private readonly cleanups: (() => void)[] = []
    private disposed = false

    constructor(host: HTMLElement, labelsLayer: HTMLElement, callbacks: PlantSceneCallbacks) {
        this.host = host
        this.labelsLayer = labelsLayer
        this.callbacks = callbacks
        this.introDone = this.reduceMotion

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFShadowMap
        this.renderer.toneMapping = THREE.NeutralToneMapping
        host.appendChild(this.renderer.domElement)
        this.renderer.domElement.style.display = 'block'
        this.renderer.domElement.style.touchAction = 'none'
        this.renderer.domElement.style.outline = 'none'

        const pmrem = new THREE.PMREMGenerator(this.renderer)
        this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        pmrem.dispose()
        this.scene.environment = this.envTexture

        this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.flyLight)
        this.sun.castShadow = true
        this.sun.shadow.mapSize.set(2048, 2048)
        this.sun.shadow.radius = 4
        this.sun.shadow.bias = -0.0004
        this.sun.shadow.normalBias = 0.03

        this.ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.17 }))
        this.ground.rotation.x = -Math.PI / 2
        this.ground.position.y = -0.7
        this.ground.receiveShadow = true
        this.scene.add(this.ground)

        // ---- materiales compartidos, recoloreados con el tema
        const std = (key: keyof ScenePalette, extra: THREE.MeshStandardMaterialParameters = {}) => {
            const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...extra })
            this.onTheme((p) => m.color.set(p[key] as string))
            return m
        }
        const calidad = (key: QualityLevel) => {
            const m = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.05 })
            const k = key === 'ok' ? 'ok' : key === 'desviado' ? 'desviado' : 'fuera'
            this.onTheme((p) => { m.color.set(p[k]); m.emissive.set(p[k]).multiplyScalar(p.glow) })
            return m
        }
        const basic = (fn: (m: THREE.MeshBasicMaterial, p: ScenePalette) => void, extra: THREE.MeshBasicMaterialParameters = {}) => {
            const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, ...extra })
            this.onTheme((p) => fn(m, p))
            return m
        }
        this.M = {
            board: std('board'), boardSide: std('boardSide'),
            tile: std('tile', { roughness: 0.9 }), tileSide: std('tileSide'),
            pallet: std('pallet', { roughness: 0.95 }), palletSide: std('palletSide', { roughness: 0.95 }),
            scaleBase: std('scaleBase', { roughness: 0.6 }), scalePlat: std('scalePlat', { roughness: 0.45, metalness: 0.25 }),
            scaleStripe: std('scaleStripe', { roughness: 0.5 }), chevron: std('chevron'),
            ok: calidad('ok'), desviado: calidad('desviado'), fuera: calidad('fuera'),
            diamond: (() => { const m = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.2 }); this.onTheme((p) => { m.color.set(p.desviado); m.emissive.set(p.desviado).multiplyScalar(0.45) }); return m })(),
        }
        this.B = {
            ok: basic((m, p) => m.color.set(p.ok), { transparent: false, depthWrite: true }),
            desviado: basic((m, p) => m.color.set(p.desviado), { transparent: false, depthWrite: true }),
            fuera: basic((m, p) => m.color.set(p.fuera), { transparent: false, depthWrite: true }),
            warnRing: basic((m, p) => m.color.set(p.desviado), { opacity: 0.8 }),
            brandRing: basic((m, p) => m.color.set(p.brand), { opacity: 0.9 }),
            disc: basic((m, p) => { m.color.set(p.disc); m.opacity = p.discOpacity }),
            discLine: basic((m, p) => m.color.set(p.tileInk.replace(/rgba\(([^,]+),([^,]+),([^,]+),.*/, 'rgb($1,$2,$3)')), { opacity: 0.35 }),
            discLimit: basic((m, p) => m.color.set(p.fuera), { opacity: 0.75 }),
            discBand: basic((m, p) => m.color.set(p.ok), { opacity: 0.14 }),
        }

        this.tileLabelMats = TILE_X.map(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }))
        this.flowTexture = this.makeFlowTexture()

        // ---- estación de pesaje
        this.scene.add(this.station)
        addMesh(this.station, slab(6.2, 0.32, 6.2, 1.1, 0.08), this.M.scaleBase)
        this.platform = addMesh(this.station, slab(4.6, 0.16, 4.6, 0.45, 0.04), this.M.scalePlat, 0, 0.32, 0)
        this.platform.userData = { kind: 'bascula' }
        for (const x of [-1.9, 1.9]) addMesh(this.station, slab(0.22, 0.03, 4.2, 0.06, 0.01), this.M.scaleStripe, x, 0.48, 0, false)
        addMesh(this.station, slab(0.62, 2.7, 0.62, 0.18, 0.05), this.M.scaleBase, -2.45, 0.32, -2.45)
        const pantalla = addMesh(this.station, slab(1.7, 1.0, 0.16, 0.1, 0.03), this.M.scaleBase, -2.45, 2.65, -2.3)
        pantalla.rotation.y = 0.45
        const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
        this.onTheme((p) => ringMat.color.set(p.brand))
        this.stationRing = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.86, 72).rotateX(-Math.PI / 2), ringMat)
        this.stationRing.position.y = 0.34
        this.station.add(this.stationRing)

        this.operario = createPerson({ vest: '#F2B705', hat: '#F2B705', skin: SKIN[1] })
        this.operario.root.position.set(-2.35, 0.32, -1.15)
        this.operario.root.rotation.y = Math.atan2(2.35, 1.15)
        this.station.add(this.operario.root)
        this.ayudante = createPerson({ vest: '#FF7A1A', hat: '#F2B705', skin: SKIN[3], sack: true })
        this.ayudante.root.position.set(0.4, 0.32, 2.75)
        this.ayudante.root.rotation.y = Math.PI
        this.station.add(this.ayudante.root)

        this.lcdLabel = this.addLabel(CLASES.visor, () => this.station.position.clone().add(new V3(-2.45, 4.0, -2.3)))
        this.renderLcd()

        this.scene.add(this.ambient)

        // ---- selección y diana
        this.selRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.7, 64).rotateX(-Math.PI / 2), this.B.brandRing)
        this.selRing.visible = false
        this.scene.add(this.selRing)

        const D_LIM = 1.12
        const D_OUT = 1.5
        this.dianaTilt.add(new THREE.Mesh(new THREE.CircleGeometry(D_OUT, 72), this.B.disc))
        const banda = new THREE.Mesh(new THREE.RingGeometry(0, D_LIM * 0.6, 72), this.B.discBand); banda.position.z = 0.002
        const limite = new THREE.Mesh(new THREE.RingGeometry(D_LIM - 0.02, D_LIM + 0.02, 96), this.B.discLimit); limite.position.z = 0.003
        const medio = new THREE.Mesh(new THREE.RingGeometry(D_LIM * 0.6 - 0.008, D_LIM * 0.6 + 0.008, 96), this.B.discLine); medio.position.z = 0.003
        const eje = new THREE.Mesh(new THREE.PlaneGeometry(0.014, D_OUT * 2), this.B.discLine); eje.position.z = 0.003
        const centro = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 32), this.B.brandRing); centro.position.z = 0.004
        this.dianaTilt.add(banda, limite, medio, eje, centro, this.dianaDots)
        this.dianaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), this.B.discLine)
        this.diana.add(this.dianaTilt, this.dianaStem)
        this.diana.visible = false
        this.scene.add(this.diana)

        for (let i = 0; i < 16; i++) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }))
            m.visible = false
            this.scene.add(m)
            this.trail.push(m)
        }

        this.applyTheme()
        this.bindInput()

        this.resizeObserver = new ResizeObserver(() => this.resize())
        this.resizeObserver.observe(host)
        this.resize()

        const alCambiarVisibilidad = () => (document.visibilityState === 'visible' ? this.start() : this.stop())
        document.addEventListener('visibilitychange', alCambiarVisibilidad)
        this.cleanups.push(() => document.removeEventListener('visibilitychange', alCambiarVisibilidad))

        const canvas = this.renderer.domElement
        const perdido = (e: Event) => { e.preventDefault(); this.stop() }
        const restaurado = () => this.start()
        canvas.addEventListener('webglcontextlost', perdido)
        canvas.addEventListener('webglcontextrestored', restaurado)
        this.cleanups.push(() => { canvas.removeEventListener('webglcontextlost', perdido); canvas.removeEventListener('webglcontextrestored', restaurado) })

        if (document.fonts) void document.fonts.ready.then(() => { if (!this.disposed) this.refreshTileTextures() })

        this.start()
    }

    // ================================================================ API pública

    /** Pinta la foto y anima lo que cambió. Cada `seq` se aplica una sola vez. */
    apply(snapshot: PlantSnapshot, slots: SlotMap, events: PlantEvent[], seq: number) {
        if (this.disposed || seq === this.seq) return
        const primera = this.snapshot === null
        this.seq = seq
        this.snapshot = snapshot
        const animar = !primera && !this.reduceMotion

        this.syncLayout(slots)

        const quitados = new Map<number, Extract<PlantEvent, { type: 'lot-removed' }>>()
        for (const e of events) if (e.type === 'lot-removed') quitados.set(e.lotId, e)

        // Clientes
        const presentes = new Set(snapshot.clientes.map((c) => c.id))
        for (const cv of [...this.clients.values()]) if (!presentes.has(cv.id)) this.removeClient(cv, animar)
        for (const c of snapshot.clientes) {
            const fila = slots.rows[c.id] ?? 0
            const cv = this.clients.get(c.id)
            if (!cv) this.createClient(c, fila, animar)
            else {
                cv.data = c
                if (cv.row !== fila) { cv.row = fila; cv.group.position.z = rowZ(fila); this.rebuildFlow(cv) }
            }
            this.updateOverflow(this.clients.get(c.id)!, slots.overflow[c.id] ?? {})
        }

        // Lotes que dejan el tablero
        const vigentes = new Map<number, { client: PlantClient; lot: PlantLot }>()
        for (const c of snapshot.clientes) for (const l of c.lotes) if (l.etapa !== 'rechazado' && slots.lots[l.id]) vigentes.set(l.id, { client: c, lot: l })
        for (const lv of [...this.lots.values()]) if (!vigentes.has(lv.id)) this.removeLot(lv, animar ? quitados.get(lv.id) : undefined)

        // Lotes que entran, se mueven o cambian sus conteos
        for (const { client, lot } of vigentes.values()) {
            const slot = slots.lots[lot.id]
            const fila = slots.rows[client.id] ?? 0
            const lv = this.lots.get(lot.id)
            if (!lv) { this.createLot(client.id, lot, slot.stage, slot.slot, fila, animar); continue }
            lv.data = lot
            if (lv.stage !== slot.stage || lv.slot !== slot.slot || lv.row !== fila) this.moveLot(lv, slot.stage, slot.slot, fila, animar)
            else if (!lv.moving) this.rebuildLot(lv)
            this.updateLotLabel(lv)
        }

        // Pesajes nuevos: vuelan los más recientes; el resto ya está en los conteos.
        const nuevos = events.filter((e): e is Extract<PlantEvent, { type: 'weighing-added' }> => e.type === 'weighing-added')
        if (animar) {
            for (const e of nuevos.slice(-MAX_VUELOS)) {
                const lv = this.lots.get(e.lotId)
                if (!lv) continue
                lv.pending.add(e.weighing.id)
                if (!lv.moving) this.rebuildLot(lv)
                this.weighQueue.push({ lotId: e.lotId, weighing: e.weighing })
            }
            while (this.weighQueue.length > MAX_VUELOS) this.landWithoutFlight(this.weighQueue.shift()!)
        }

        if (primera) {
            const ultimo = snapshot.clientes.flatMap((c) => c.lotes.flatMap((l) => l.ultimos_pesajes.map((w) => ({ l, w })))).sort((a, b) => b.w.id - a.w.id)[0]
            if (ultimo) this.showOnLcd(ultimo.l, ultimo.w, 'Último pesaje')
            this.focusCamera(true)
            this.startIntro()
        } else if (this.selection.clientId === null) {
            this.focusCamera(false)
        }

        this.refreshSelectionVisuals()
    }

    /** La selección viene de React; `weighings` es el detalle del lote seleccionado, para la diana. */
    setSelection(selection: PlantSelection, weighings: PlantWeighing[] | null) {
        const cambioFoco = selection.clientId !== this.selection.clientId || selection.lotId !== this.selection.lotId || selection.weighingId !== this.selection.weighingId
        this.selection = selection
        this.selectionWeighings = weighings ?? []
        this.refreshSelectionVisuals()
        if (cambioFoco) this.focusCamera(false)
    }

    setInsets(insets: SceneInsets) {
        if (insets.top === this.insets.top && insets.right === this.insets.right && insets.bottom === this.insets.bottom) return
        this.insets = insets
        this.applyViewOffset()
        if (this.selection.clientId === null) this.focusCamera(false)
    }

    zoomBy(factor: number) {
        this.goal.r = clamp(this.goal.r * factor, 8, 200)
    }

    setTheme() {
        this.applyTheme()
    }

    dispose() {
        if (this.disposed) return
        this.disposed = true
        this.stop()
        this.resizeObserver.disconnect()
        this.cleanups.forEach((f) => f())
        this.labels.forEach((l) => l.el.remove())
        this.labels.length = 0
        const geometrias = new Set<THREE.BufferGeometry>()
        const materiales = new Set<THREE.Material>()
        this.scene.traverse((o) => {
            const m = o as THREE.Mesh
            if (m.isMesh) {
                geometrias.add(m.geometry)
                ;(Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => materiales.add(x))
            }
        })
        geometrias.forEach((g) => g.dispose())
        materiales.forEach((m) => {
            const mapa = (m as THREE.MeshBasicMaterial).map
            if (mapa) mapa.dispose()
            m.dispose()
        })
        this.tileLabelMats.forEach((m) => { m.map?.dispose(); m.dispose() })
        this.flowTexture.dispose()
        this.envTexture?.dispose()
        disposeGeometryCache()
        disposeFigureMaterials()
        this.renderer.dispose()
        this.renderer.forceContextLoss()
        this.renderer.domElement.remove()
    }

    // ================================================================ tema

    private onTheme(fn: Themed) {
        this.themed.add(fn)
        fn(this.palette)
        return fn
    }

    private applyTheme() {
        this.palette = readPalette()
        const p = this.palette
        this.themed.forEach((fn) => fn(p))
        this.hemi.color.set(p.hemiSky)
        this.hemi.groundColor.set(p.hemiGround)
        this.hemi.intensity = p.hemiIntensity
        this.sun.intensity = p.sunIntensity
        this.rim.intensity = p.rimIntensity
        this.scene.environmentIntensity = p.envIntensity
        this.ground.material.opacity = p.shadowOpacity
        this.refreshTileTextures()
        this.refreshSelectionVisuals()
    }

    private refreshTileTextures() {
        this.tileLabelMats.forEach((m, k) => {
            m.map?.dispose()
            m.map = this.makeTileTexture(k)
            m.needsUpdate = true
        })
    }

    private makeTileTexture(k: number): THREE.CanvasTexture {
        const W = 1024
        const H = Math.round((1024 * TILE_D) / TILE_W)
        const c = document.createElement('canvas')
        c.width = W
        c.height = H
        const x = c.getContext('2d')!
        x.strokeStyle = this.palette.tileLine
        x.lineWidth = 5
        x.setLineDash([22, 16])
        const slots = k === STAGE_INDEX.finalizado ? [SLOT_OFFSETS[0], SLOT_OFFSETS[2]] : SLOT_OFFSETS
        for (const s of slots) {
            const cx = ((s.x + TILE_W / 2) / TILE_W) * W
            const cy = ((s.z + TILE_D / 2) / TILE_D) * H
            const sz = (2.56 / TILE_W) * W
            x.beginPath()
            x.roundRect(cx - sz / 2, cy - sz / 2, sz, sz, 30)
            x.stroke()
        }
        x.setLineDash([])
        x.fillStyle = this.palette.tileInk
        x.font = '600 50px "Geist Variable", Geist, system-ui, sans-serif'
        if ('letterSpacing' in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '7px'
        const etapa = ACTIVE_STAGES[k]
        x.fillText(`${k + 1}  ${STAGE_LABEL[etapa].toUpperCase()}`, 58, H - 52)
        const t = new THREE.CanvasTexture(c)
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        return t
    }

    private makeFlowTexture(): THREE.CanvasTexture {
        const c = document.createElement('canvas')
        c.width = 256
        c.height = 64
        const x = c.getContext('2d')!
        x.fillStyle = '#fff'
        for (let i = 0; i < 2; i++) {
            const x0 = 18 + i * 128
            const w = 70
            x.beginPath()
            x.moveTo(x0 + 16, 18); x.lineTo(x0 + w, 18); x.lineTo(x0 + w + 16, 32); x.lineTo(x0 + w, 46); x.lineTo(x0 + 16, 46); x.lineTo(x0 + 32, 32)
            x.closePath()
            x.fill()
        }
        const t = new THREE.CanvasTexture(c)
        t.wrapS = THREE.RepeatWrapping
        t.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
        return t
    }

    // ================================================================ tablero

    private stationZ() {
        return ((this.minRow + this.maxRow) / 2) * ROW
    }

    /** Rehace tablero, estación, cintas y ambientación cuando cambia el rango de filas usado. */
    private syncLayout(slots: SlotMap) {
        const filas = Object.values(slots.rows)
        const min = filas.length ? Math.min(...filas) : 0
        const max = filas.length ? Math.max(...filas) : 0
        const clave = `${min}|${max}`
        if (clave === this.layoutKey) return
        this.layoutKey = clave
        this.minRow = min
        this.maxRow = max

        const z0 = rowZ(min) - TERR_D / 2 - 2.1
        const z1 = rowZ(max) + TERR_D / 2 + 2.1
        if (this.board) { this.scene.remove(this.board); this.board.geometry.dispose() }
        // Geometría propia, fuera del caché: cambia con cada rango de filas.
        const w = BOARD_X1 - BOARD_X0
        const d = z1 - z0
        this.board = addMesh(this.scene, slab(w, 0.7, d, 1.6, 0.12).clone(), [this.M.board, this.M.boardSide], (BOARD_X0 + BOARD_X1) / 2, -0.7, (z0 + z1) / 2)

        const cz = this.stationZ()
        this.station.position.set(SCALE_X, 0, cz)
        const extension = Math.max(w, d) / 2 + 6
        this.sun.target.position.set((BOARD_X0 + BOARD_X1) / 2, 0, cz)
        this.sun.position.set(this.sun.target.position.x + 30, 46, cz + 30)
        Object.assign(this.sun.shadow.camera, { left: -extension, right: extension, top: extension, bottom: -extension, near: 5, far: 160 })
        this.sun.shadow.camera.updateProjectionMatrix()

        this.clients.forEach((cv) => this.rebuildFlow(cv))
        this.buildAmbient(z0)
    }

    private buildAmbient(z0: number) {
        while (this.ambient.children.length) this.ambient.remove(this.ambient.children[0])
        this.walkers = []
        this.pushers = []
        this.chatters = []

        const pasillos: number[] = []
        for (let r = this.minRow; r < this.maxRow; r++) pasillos.push(rowZ(r) + ROW / 2)
        pasillos.push(rowZ(this.minRow) - TERR_D / 2 - 0.95, rowZ(this.maxRow) + TERR_D / 2 + 0.95)

        const chalecos: [string, string][] = [['#F2B705', '#F2B705'], ['#FF7A1A', '#FFFFFF'], ['#C6E03A', '#F2B705'], ['#FF7A1A', '#FF7A1A'], ['#F2B705', '#FFFFFF'], ['#C6E03A', '#FFFFFF']]
        let semilla = 7
        const rnd = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647 }

        // Carritos de picking en dos pasillos y en el borde delantero; caminantes en el resto.
        const conCarrito = new Set([0, Math.min(2, pasillos.length - 2), pasillos.length - 1].filter((i) => i >= 0))
        const cz = this.stationZ()
        let k = 0
        pasillos.forEach((z, i) => {
            if (conCarrito.has(i)) {
                const person = createPerson({ vest: k === 1 ? '#C6E03A' : '#FF7A1A', hat: k === 2 ? '#FFFFFF' : '#F2B705', skin: SKIN[(i + 2) % SKIN.length], phase: rnd() * 6 })
                person.pushing = true
                const root = new THREE.Group()
                root.add(person.root)
                const carrito = createCart(k === 1 ? '#2E6B45' : '#E4513D')
                carrito.position.z = 0.8
                root.add(carrito)
                this.ambient.add(root)
                const puntos = [new V3(-3.2, 0, cz + 3.6 + k * 0.9), new V3(-0.7, 0, z), new V3(STRIP_X1 - 1.4, 0, z), new V3(-0.7, 0, z)]
                this.pushers.push({ person, root, points: puntos, index: (k + 1) % puntos.length, wait: k * 1.5, speed: 0.9 + k * 0.12, pos: puntos[k % puntos.length].clone() })
                k++
                return
            }
            for (const carril of [-0.22, 0.22]) {
                const [vest, hat] = chalecos[(i * 2 + (carril > 0 ? 1 : 0)) % chalecos.length]
                const person = createPerson({ vest, hat, skin: SKIN[(i + (carril > 0 ? 3 : 0)) % SKIN.length], sack: rnd() < 0.5, phase: rnd() * 6 })
                this.ambient.add(person.root)
                const x = 2 + rnd() * (STRIP_X1 - 4.6)
                this.walkers.push({ person, z: z + carril, x: carril > 0 ? x : STRIP_X1 + 0.4 - x, dir: carril > 0 ? 1 : -1, speed: 0.75 + rnd() * 0.5, wait: 0 })
            }
        })

        const zCharla = Math.max(z0 + 1.6, cz - 6.4)
        const ronda: [number, number][] = [[-0.55, 0], [0.5, -0.2], [0, 0.6]]
        ronda.forEach(([dx, dz], j) => {
            const person = createPerson({ vest: ['#F2B705', '#C6E03A', '#F3F5F4'][j], hat: ['#F2B705', '#FFFFFF', '#FFFFFF'][j], skin: SKIN[(j + 1) % SKIN.length], phase: j * 2 })
            person.root.position.set(SCALE_X - 1.6 + dx, 0, zCharla + dz)
            person.root.rotation.y = Math.atan2(-dx, -dz)
            this.ambient.add(person.root)
            this.chatters.push(person)
        })
    }

    // ================================================================ clientes

    private createClient(c: PlantClient, row: number, animar: boolean) {
        const color = clientColor(row)
        const group = new THREE.Group()
        group.position.set(0, 0, rowZ(row))
        this.scene.add(group)

        const topMat = new THREE.MeshStandardMaterial({ roughness: 0.85 })
        const sideMat = new THREE.MeshStandardMaterial({ roughness: 0.7 })
        const contMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 })
        const ribMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.15 })
        const flowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, map: this.flowTexture.clone() })
        flowMat.map!.needsUpdate = true
        const tema = this.onTheme((p) => {
            topMat.color.set(color).lerp(new THREE.Color(p.board), p.dark ? 0.7 : 0.8)
            sideMat.color.set(color).lerp(new THREE.Color(p.boardSide), p.dark ? 0.25 : 0.05)
            contMat.color.set(color).lerp(new THREE.Color('#000000'), p.dark ? 0.15 : 0)
            ribMat.color.set(color).lerp(new THREE.Color('#000000'), 0.28)
            flowMat.color.set(color)
        })

        const picks: THREE.Object3D[] = []
        const terr = addMesh(group, slab(STRIP_X1 - STRIP_X0, TERR_TOP, TERR_D, 1.0, 0.07), [topMat, sideMat], (STRIP_X0 + STRIP_X1) / 2, 0, 0)
        terr.userData = { kind: 'cliente', clientId: c.id }
        picks.push(terr)
        TILE_X.forEach((tx, k) => {
            const tile = addMesh(group, slab(TILE_W, 0.08, TILE_D, 0.55, 0.03), [this.M.tile, this.M.tileSide], tx, TERR_TOP, 0)
            tile.userData = { kind: 'cliente', clientId: c.id }
            picks.push(tile)
            const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(TILE_W, TILE_D).rotateX(-Math.PI / 2), this.tileLabelMats[k])
            rotulo.position.set(tx, TILE_TOP + 0.004, 0)
            rotulo.renderOrder = 1
            group.add(rotulo)
            if (k < TILE_X.length - 1) {
                const flecha = addMesh(group, new THREE.ConeGeometry(0.2, 0.34, 3), this.M.chevron, tx + TILE_W / 2 + 0.25, TILE_TOP - 0.02, 2.9, false)
                flecha.rotation.z = -Math.PI / 2
                flecha.scale.set(1, 1, 0.35)
            }
        })

        const iniciales = escapar(clientInitials(c.nombre))
        const label = this.addLabel(CLASES.cliente, () => group.position.clone().add(new V3(STRIP_X0 + 1.2, TERR_TOP + 0.3, -3.5)), () => this.callbacks.onPick({ kind: 'cliente', clientId: c.id }))
        label.el.innerHTML = `<span class="grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)]" style="background:${color}">${iniciales}</span>`
            + `<span class="leading-tight max-[699px]:hidden"><b class="block text-[13px] font-semibold tracking-tight text-text-main">${escapar(c.nombre)}</b>`
            + `<small class="block text-[11px] text-text-muted">${escapar(c.producto ?? '')}${c.codigo_exportacion ? ` · ${escapar(c.codigo_exportacion)}` : ''}</small></span>`

        const cv: ClientVisual = { id: c.id, data: c, row, color, group, picks, topMat, sideMat, contMat, ribMat, flowMat, flow: null, label, overflow: new Map(), theme: tema }
        this.clients.set(c.id, cv)
        this.rebuildFlow(cv)

        if (!this.introDone) { group.scale.y = 0.001; label.show = false }
        else if (animar) {
            group.scale.y = 0.001
            this.tween(0.75, (t) => { group.scale.y = Math.max(0.001, easeBack(t)) })
        }
    }

    private rebuildFlow(cv: ClientVisual) {
        if (cv.flow) { this.scene.remove(cv.flow); cv.flow.geometry.dispose() }
        const cz = this.stationZ()
        const z = rowZ(cv.row)
        const curva = new THREE.CatmullRomCurve3([
            new V3(SCALE_X + 3.1, 0.015, cz),
            new V3(SCALE_X + 5.2, 0.015, cz + (z - cz) * 0.22),
            new V3(-1.1, 0.015, cz + (z - cz) * 0.9),
            new V3(STRIP_X0 + 0.2, 0.015, z),
        ], false, 'centripetal')
        const n = 90
        const largo = curva.getLength()
        const pos: number[] = []
        const uv: number[] = []
        const idx: number[] = []
        for (let i = 0; i <= n; i++) {
            const t = i / n
            const p = curva.getPointAt(t)
            const tg = curva.getTangentAt(t)
            const l = Math.hypot(tg.z, tg.x) || 1
            const nx = -tg.z / l
            const nz = tg.x / l
            pos.push(p.x + nx * 0.21, p.y, p.z + nz * 0.21, p.x - nx * 0.21, p.y, p.z - nz * 0.21)
            uv.push((t * largo) / 1.5, 0, (t * largo) / 1.5, 1)
            if (i < n) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
        g.setIndex(idx)
        cv.flow = new THREE.Mesh(g, cv.flowMat)
        cv.flow.renderOrder = 2
        this.scene.add(cv.flow)
    }

    private updateOverflow(cv: ClientVisual, overflow: Partial<Record<ActiveStage, number>>) {
        for (const etapa of ACTIVE_STAGES) {
            const n = overflow[etapa] ?? 0
            let label = cv.overflow.get(etapa)
            if (n > 0 && !label) {
                const x = TILE_X[STAGE_INDEX[etapa]] + TILE_W / 2 - 0.6
                label = this.addLabel(CLASES.exceso, () => cv.group.position.clone().add(new V3(x, TILE_TOP + 0.1, TILE_D / 2 - 0.5)))
                cv.overflow.set(etapa, label)
            }
            if (label) {
                if (n > 0) label.el.textContent = `+${n} ${n === 1 ? 'lote' : 'lotes'}`
                else { this.removeLabel(label); cv.overflow.delete(etapa) }
            }
        }
    }

    private removeClient(cv: ClientVisual, animar: boolean) {
        this.clients.delete(cv.id)
        for (const lv of [...this.lots.values()]) if (lv.clientId === cv.id) this.removeLot(lv, undefined)
        this.removeLabel(cv.label)
        cv.overflow.forEach((l) => this.removeLabel(l))
        if (cv.flow) { this.scene.remove(cv.flow); cv.flow.geometry.dispose() }
        const terminar = () => {
            this.scene.remove(cv.group)
            this.themed.delete(cv.theme)
            ;[cv.topMat, cv.sideMat, cv.contMat, cv.ribMat].forEach((m) => m.dispose())
            cv.flowMat.map?.dispose()
            cv.flowMat.dispose()
        }
        if (animar) this.tween(0.6, (t) => { cv.group.scale.y = Math.max(0.001, 1 - easeOut(t)) }, terminar)
        else terminar()
    }

    // ================================================================ lotes

    private createLot(clientId: number, lot: PlantLot, stage: ActiveStage, slot: number, row: number, animar: boolean) {
        const group = new THREE.Group()
        const p = slotPosition(row, stage, slot)
        group.position.set(p.x, p.y, p.z)
        this.scene.add(group)
        const base = addMesh(group, slab(2.4, 0.2, 2.4, 0.32, 0.05), [this.M.pallet, this.M.palletSide])
        base.userData = { kind: 'lote', clientId, lotId: lot.id }
        const stacks = new THREE.Group()
        stacks.position.y = 0.2
        const status = new THREE.Group()
        group.add(stacks, status)

        const lv: LotVisual = {
            id: lot.id, clientId, data: lot, stage, slot, row, group, base, stacks, status,
            picks: [base], tokens: new Map(), pulse: null, spin: null, people: [], truck: null, container: null,
            topY: 0.2, label: null as unknown as Label, pending: new Set(), moving: false,
        }
        lv.label = this.addLabel(CLASES.lote, () => lv.group.position.clone().add(new V3(0, lv.topY + 0.45, 0)), () => this.callbacks.onPick({ kind: 'lote', clientId, lotId: lot.id }))
        this.lots.set(lot.id, lv)
        this.rebuildLot(lv)
        this.updateLotLabel(lv)

        if (!this.introDone) { group.visible = false; lv.label.show = false }
        else if (animar) {
            group.scale.setScalar(0.01)
            this.tween(0.7, (t) => group.scale.setScalar(Math.max(0.01, easeBack(t))))
            this.ripple(group.position, this.clients.get(clientId)?.color ?? this.palette.brand)
        }
    }

    private updateLotLabel(lv: LotVisual) {
        const d = lv.data
        const pct = d.bultos ? ((d.bultos - d.bultos_fuera_rango) / d.bultos) * 100 : null
        const color = this.clients.get(lv.clientId)?.color ?? '#888'
        lv.label.el.innerHTML = `<i class="size-[7px] rounded-full" style="background:${color}"></i><b class="font-mono text-[11px] font-semibold">${escapar(d.nombre_lote)}</b>`
            + `<span class="tabular-nums opacity-70">${nf0.format(d.bultos)}${pct === null ? '' : ` · ${nf0.format(pct)}%`}</span>`
    }

    /** Lo que la pila muestra: los conteos del lote menos lo que todavía vuela. */
    private visibleCounts(lv: LotVisual) {
        const d = lv.data
        const enVuelo = d.ultimos_pesajes.filter((w) => lv.pending.has(w.id))
        const vueloFuera = enVuelo.filter((w) => w.fuera_de_rango).length
        const recientes = d.ultimos_pesajes.filter((w) => !lv.pending.has(w.id)).slice().reverse()
        return {
            enRango: Math.max(0, d.bultos - d.bultos_fuera_rango - (enVuelo.length - vueloFuera)),
            fuera: Math.max(0, d.bultos_fuera_rango - vueloFuera),
            recientesEnRango: recientes.filter((w) => !w.fuera_de_rango),
            recientesFuera: recientes.filter((w) => w.fuera_de_rango),
        }
    }

    private rebuildLot(lv: LotVisual) {
        const vaciar = (g: THREE.Group) => { while (g.children.length) g.remove(g.children[0]) }
        vaciar(lv.stacks)
        // La ambientación del lote se recrea, salvo el camión y el contenedor mientras se van.
        vaciar(lv.status)
        lv.picks = [lv.base]
        lv.tokens = new Map()
        lv.pulse = null
        lv.spin = null
        lv.people = []
        lv.truck = null
        lv.container = null

        const cliente = this.clients.get(lv.clientId)
        const d = lv.data
        let niveles = 0

        if (lv.stage === 'finalizado') {
            const cont = new THREE.Group()
            lv.status.add(cont)
            const caja = addMesh(cont, slab(2.25, 1.2, 1.7, 0.12, 0.04), cliente?.contMat ?? this.M.pallet, 0, 0.2, 0)
            caja.userData = { kind: 'lote', clientId: lv.clientId, lotId: lv.id }
            lv.picks.push(caja)
            for (let k = 0; k < 7; k++) addMesh(cont, new THREE.BoxGeometry(0.05, 1.0, 1.74), cliente?.ribMat ?? this.M.pallet, -0.95 + k * 0.32, 0.82, 0, false)
            lv.container = cont
            const camion = createTruck(cliente?.color ?? '#888')
            camion.root.position.set(2.9, 0, -0.05)
            lv.status.add(camion.root)
            camion.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.userData = { kind: 'lote', clientId: lv.clientId, lotId: lv.id }; lv.picks.push(o) } })
            lv.truck = camion
            const cargador = createPerson({ vest: '#FF7A1A', hat: '#FF7A1A', skin: SKIN[lv.id % SKIN.length], phase: lv.id })
            cargador.root.position.set(1.45, 0, 1.2)
            cargador.root.rotation.y = -2.3
            lv.status.add(cargador.root)
            lv.people.push({ person: cargador, kind: 'cargador' })
            niveles = 8
        } else {
            const c = this.visibleCounts(lv)
            const muestraEnRango = Math.min(c.enRango, CAP_IN)
            const muestraFuera = Math.min(c.fuera, CAP_OUT)
            // Las fichas de arriba son las recientes: esas sí saben su pesaje y su color.
            const recEnRango = c.recientesEnRango.slice(-muestraEnRango)
            const recFuera = c.recientesFuera.slice(-muestraFuera)
            for (let j = 0; j < muestraEnRango; j++) {
                const reciente = recEnRango[j - (muestraEnRango - recEnRango.length)]
                const nivel: QualityLevel = reciente ? qualityLevel(d, Number(reciente.peso_neto), reciente.fuera_de_rango) : 'ok'
                const s = STACKS[j % 3]
                const semilla = reciente?.id ?? j
                const m = addMesh(lv.stacks, chipGeometry, this.M[nivel], s.x + ((semilla % 5) - 2) * 0.012, Math.floor(j / 3) * CHIP_H, s.z + ((semilla % 3) - 1) * 0.012)
                m.rotation.y = (semilla % 7) * 0.45
                if (reciente) { m.userData = { kind: 'pesaje', clientId: lv.clientId, lotId: lv.id, weighingId: reciente.id }; lv.tokens.set(reciente.id, m) }
                else m.userData = { kind: 'lote', clientId: lv.clientId, lotId: lv.id }
                lv.picks.push(m)
            }
            for (let j = 0; j < muestraFuera; j++) {
                const reciente = recFuera[j - (muestraFuera - recFuera.length)]
                const m = addMesh(lv.stacks, chipGeometry, this.M.fuera, RED_STACK.x, j * CHIP_H, RED_STACK.z)
                m.rotation.y = ((reciente?.id ?? j) % 7) * 0.45
                if (reciente) { m.userData = { kind: 'pesaje', clientId: lv.clientId, lotId: lv.id, weighingId: reciente.id }; lv.tokens.set(reciente.id, m) }
                else m.userData = { kind: 'lote', clientId: lv.clientId, lotId: lv.id }
                lv.picks.push(m)
            }
            niveles = Math.max(Math.ceil(muestraEnRango / 3), muestraFuera)

            if (lv.stage === 'en-pesaje') {
                const estibador = createPerson({ vest: '#F2B705', hat: '#FF7A1A', skin: SKIN[(lv.id + 4) % SKIN.length], phase: lv.id })
                estibador.root.position.set(-1.32, 0, 1.38)
                estibador.root.rotation.y = Math.atan2(1.32, -1.38)
                lv.status.add(estibador.root)
                lv.people.push({ person: estibador, kind: 'estibador' })
            }
            if (lv.stage === 'por-aprobar') {
                const anillo = new THREE.Mesh(new THREE.RingGeometry(1.42, 1.6, 56).rotateX(-Math.PI / 2), this.B.warnRing)
                anillo.position.y = 0.01
                lv.status.add(anillo)
                lv.pulse = anillo
                lv.spin = addMesh(lv.status, new THREE.OctahedronGeometry(0.24), this.M.diamond, 0, 0.2 + niveles * CHIP_H + 0.55, 0)
                const supervisor = createPerson({ vest: '#F3F5F4', hat: '#FFFFFF', pants: '#3A4656', clipboard: true, skin: SKIN[(lv.id + 2) % SKIN.length], phase: lv.id })
                supervisor.root.position.set(1.32, 0, 1.38)
                supervisor.root.rotation.y = Math.atan2(-1.32, -1.38)
                lv.status.add(supervisor.root)
                lv.people.push({ person: supervisor, kind: 'supervisor' })
            }
        }

        lv.topY = 0.2 + niveles * CHIP_H
        if (this.selection.lotId === lv.id) this.refreshSelectionVisuals()
    }

    private moveLot(lv: LotVisual, stage: ActiveStage, slot: number, row: number, animar: boolean) {
        const destino = slotPosition(row, stage, slot)
        const hasta = new V3(destino.x, destino.y, destino.z)
        const etapaAnterior = lv.stage
        lv.stage = stage
        lv.slot = slot
        lv.row = row
        if (!animar) {
            lv.group.position.copy(hasta)
            this.rebuildLot(lv)
            return
        }
        const desde = lv.group.position.clone()
        lv.moving = true
        this.tween(1.0, (t) => {
            const e = ease(t)
            lv.group.position.lerpVectors(desde, hasta, e)
            lv.group.position.y = hasta.y + Math.sin(e * Math.PI) * 2.4
            lv.group.rotation.y = Math.sin(e * Math.PI) * 0.25
        }, () => {
            lv.moving = false
            lv.group.position.copy(hasta)
            lv.group.rotation.y = 0
            this.rebuildLot(lv)
            this.updateLotLabel(lv)
            lv.group.scale.set(1.15, 0.8, 1.15)
            this.tween(0.45, (t) => { const s = easeBack(t); lv.group.scale.set(1.15 - 0.15 * s, 0.8 + 0.2 * s, 1.15 - 0.15 * s) })
            this.ripple(hasta, this.palette.brand)
            if (stage === 'finalizado' && etapaAnterior !== 'finalizado' && lv.truck) {
                const camion = lv.truck
                camion.root.position.x = 7.5
                this.tween(1.6, (t) => {
                    camion.root.position.x = 2.9 + 4.6 * (1 - easeOut(t))
                    camion.wheels.forEach((w) => { w.rotation.y += 0.22 * (1 - t) })
                })
            }
            if (this.selection.lotId === lv.id) this.focusCamera(false)
        })
    }

    private removeLot(lv: LotVisual, evento: Extract<PlantEvent, { type: 'lot-removed' }> | undefined) {
        this.lots.delete(lv.id)
        const terminar = () => { this.scene.remove(lv.group); this.removeLabel(lv.label) }
        if (!evento) { terminar(); return }

        lv.label.show = false
        if (evento.reason === 'rechazado') {
            // La tarima se tiñe de rojo, se inclina y cae fuera del territorio.
            lv.base.material = this.M.fuera
            const y0 = lv.group.position.y
            const x0 = lv.group.position.x
            this.tween(1.2, (t) => {
                const e = easeOut(t)
                lv.group.rotation.z = -e * 0.9
                lv.group.position.x = x0 + e * 1.5
                lv.group.position.y = y0 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.8 - Math.max(0, t - 0.55) * 6
                lv.group.scale.setScalar(Math.max(0.01, 1 - Math.max(0, t - 0.6) * 2.4))
            }, terminar)
            return
        }

        if (lv.truck && lv.container) {
            // El contenedor sube al camión y el camión sale de planta.
            const cont = lv.container
            const camion = lv.truck
            lv.people.forEach(({ person }) => { person.root.visible = false })
            this.tween(1.0, (t) => {
                const e = ease(t)
                cont.position.set(e * 2.4, Math.sin(e * Math.PI) * 1.3 + e * 0.3, -0.05 * e)
            }, () => {
                this.tween(2.0, (t) => {
                    const dx = t * t * 9
                    camion.root.position.x = 2.9 + dx
                    cont.position.x = 2.4 + dx
                    camion.wheels.forEach((w) => { w.rotation.y -= 0.3 })
                    const s = Math.max(0.001, 1 - Math.max(0, (t - 0.75) / 0.25))
                    camion.root.scale.setScalar(s)
                    cont.scale.setScalar(s)
                }, terminar)
            })
            return
        }

        const y0 = lv.group.position.y
        this.tween(1.1, (t) => {
            const e = easeOut(t)
            lv.group.position.y = y0 + e * 3
            lv.group.scale.setScalar(Math.max(0.01, 1 - e * 0.9))
        }, terminar)
    }

    // ================================================================ pesajes que vuelan

    private landWithoutFlight(item: { lotId: number; weighing: PlantWeighing }) {
        const lv = this.lots.get(item.lotId)
        if (!lv) return
        lv.pending.delete(item.weighing.id)
        if (!lv.moving) this.rebuildLot(lv)
    }

    private processWeighQueue() {
        if (!this.weighQueue.length || this.time < this.nextWeighAt || !this.introDone) return
        const item = this.weighQueue.shift()!
        this.nextWeighAt = this.time + ESPACIO_VUELOS
        this.fly(item)
    }

    private showOnLcd(lot: PlantLot, w: PlantWeighing, estado?: string) {
        const nivel = qualityLevel(lot, Number(w.peso_neto), w.fuera_de_rango)
        this.lcd = {
            status: estado ?? (nivel === 'ok' ? 'En rango' : nivel === 'desviado' ? 'Desviado' : 'Fuera de rango'),
            level: nivel,
            value: Number(w.peso_neto),
            user: w.usuario ?? '—',
            lot: lot.nombre_lote,
            unit: lot.unidad_medida ?? '',
        }
        this.renderLcd()
    }

    private renderLcd() {
        const l = this.lcd
        const valor = l.value === null ? '—.——' : nf2.format(l.value)
        this.lcdLabel.el.innerHTML =
            `<div class="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5E8E72]">`
            + `<span class="flex items-center gap-1.5"><i class="inline-block size-[7px] rounded-full ${PUNTO_VISOR[l.level]}"></i>Estación 1</span><span>${escapar(l.status)}</span></div>`
            + `<div class="mt-0.5 text-right font-mono text-[26px] font-semibold leading-tight tabular-nums">${valor}<small class="ml-1 text-xs text-[#5E8E72]">${escapar(l.unit)}</small></div>`
            + `<div class="flex justify-between gap-2.5 font-mono text-[10.5px] text-[#5E8E72]"><span>${escapar(l.user)}</span><span>${escapar(l.lot)}</span></div>`
    }

    private fly(item: { lotId: number; weighing: PlantWeighing }) {
        const lv = this.lots.get(item.lotId)
        if (!lv) return
        const lot = lv.data
        const peso = Number(item.weighing.peso_neto)
        const nivel = qualityLevel(lot, peso, item.weighing.fuera_de_rango)
        const color = this.palette[nivel === 'ok' ? 'ok' : nivel === 'desviado' ? 'desviado' : 'fuera']

        const ficha = new THREE.Mesh(chipGeometry, this.M[nivel])
        ficha.castShadow = true
        const desde = this.station.position.clone().add(new V3(0, 0.5, 0))
        ficha.position.copy(desde)
        ficha.scale.setScalar(0.01)
        this.scene.add(ficha)

        this.lcd = { ...this.lcd, status: 'Pesando…', level: 'busy', value: 0, user: item.weighing.usuario ?? '—', lot: lot.nombre_lote, unit: lot.unidad_medida ?? '' }
        this.operario.action = 1.2
        this.ayudante.action = 1.2
        const anillo = this.stationRing.material

        this.tween(0.35, (t) => ficha.scale.setScalar(easeBack(t) * 1.6))
        this.tween(0.85, (t) => {
            const oscila = (1 - t) * (1 - t) * (Math.sin(t * 22) * 0.9 + Math.sin(t * 47) * 0.3)
            this.lcd.value = Math.max(0, peso * (1 - Math.exp(-t * 6)) + oscila)
            anillo.opacity = 0.25 + Math.sin(t * Math.PI * 4) * 0.2
            this.renderLcd()
        }, () => {
            this.showOnLcd(lot, item.weighing)
            anillo.color.set(color)
            anillo.opacity = 0.85

            const destino = this.lots.get(item.lotId)
            if (!destino) { this.scene.remove(ficha); return }
            const hasta = this.nextTokenPosition(destino, nivel)
            const control = desde.clone().lerp(hasta, 0.5)
            control.y = 5.5 + desde.distanceTo(hasta) * 0.14
            const curva = new THREE.QuadraticBezierCurve3(desde.clone().setY(0.7), control, hasta)
            const puntos: THREE.Vector3[] = []
            this.flyLight.color.set(color)
            this.trail.forEach((m) => m.material.color.set(color))
            this.tween(1.25 + desde.distanceTo(hasta) * 0.012, (t) => {
                const e = ease(t)
                const q = curva.getPointAt(e)
                ficha.position.copy(q)
                ficha.scale.setScalar(1.6 - 0.6 * e)
                ficha.rotation.x = Math.sin(e * Math.PI) * 1.2
                ficha.rotation.y += 0.25
                this.flyLight.position.copy(q)
                this.flyLight.intensity = Math.sin(t * Math.PI) * 6
                puntos.unshift(q.clone())
                if (puntos.length > this.trail.length * 2) puntos.pop()
                this.trail.forEach((m, k) => {
                    const tp = puntos[k * 2]
                    m.visible = !!tp && t < 0.98
                    if (tp) { m.position.copy(tp); const f = 1 - k / this.trail.length; m.scale.setScalar(f * 0.9); m.material.opacity = f * 0.45 }
                })
            }, () => {
                this.scene.remove(ficha)
                this.flyLight.intensity = 0
                this.trail.forEach((m) => { m.visible = false })
                this.tween(0.9, (t) => { anillo.opacity = 0.85 * (1 - t) }, () => anillo.color.set(this.palette.brand))

                const lvFinal = this.lots.get(item.lotId)
                if (!lvFinal) return
                lvFinal.pending.delete(item.weighing.id)
                if (!lvFinal.moving) this.rebuildLot(lvFinal)
                const arriba = lvFinal.tokens.get(item.weighing.id)
                if (arriba) {
                    const y0 = arriba.position.y
                    arriba.position.y = y0 + 0.5
                    this.tween(0.35, (t) => { arriba.position.y = y0 + 0.5 * (1 - easeOut(t)) })
                }
                this.ripple(lvFinal.group.position, color)
                const estibador = lvFinal.people.find((x) => x.kind === 'estibador')
                if (estibador) estibador.person.action = 0.8
                window.setTimeout(() => {
                    if (!this.disposed && !this.weighQueue.length && this.lcd.level !== 'busy') { this.lcd.status = 'Esperando bulto'; this.lcd.level = 'idle'; this.renderLcd() }
                }, 2600)
            })
        })
    }

    private nextTokenPosition(lv: LotVisual, nivel: QualityLevel): THREE.Vector3 {
        const c = this.visibleCounts(lv)
        let local: THREE.Vector3
        if (nivel === 'fuera') local = new V3(RED_STACK.x, 0.2 + Math.min(c.fuera, CAP_OUT - 1) * CHIP_H, RED_STACK.z)
        else {
            const j = Math.min(c.enRango, CAP_IN - 1)
            local = new V3(STACKS[j % 3].x, 0.2 + Math.floor(j / 3) * CHIP_H, STACKS[j % 3].z)
        }
        return lv.group.position.clone().add(local)
    }

    // ================================================================ selección

    private refreshSelectionVisuals() {
        if (this.highlighted) { this.highlighted.scale.setScalar(1); this.highlighted = null }
        const lv = this.selection.lotId !== null ? this.lots.get(this.selection.lotId) : undefined
        this.selRing.visible = !!lv
        this.diana.visible = !!lv && this.selectionWeighings.length > 0
        if (lv) this.rebuildDiana(lv)
        if (lv && this.selection.weighingId !== null) {
            const ficha = lv.tokens.get(this.selection.weighingId)
            if (ficha) { ficha.scale.setScalar(1.3); this.highlighted = ficha }
        }
        this.clients.forEach((cv) => {
            const activo = this.selection.clientId === cv.id || this.hoverClientId === cv.id
            cv.topMat.emissive.set(activo ? cv.color : '#000000').multiplyScalar(activo ? (this.palette.dark ? 0.12 : 0.06) : 0)
            cv.label.el.style.opacity = this.selection.clientId !== null && this.selection.clientId !== cv.id ? '0.38' : ''
        })
        this.lots.forEach((l) => {
            const activo = l.id === this.selection.lotId
            CLASES.loteActivo.split(' ').forEach((c) => l.label.el.classList.toggle(c, activo))
        })
    }

    private rebuildDiana(lv: LotVisual) {
        while (this.dianaDots.children.length) this.dianaDots.remove(this.dianaDots.children[0])
        const punto = new THREE.SphereGeometry(0.06, 12, 8)
        for (const w of this.selectionWeighings) {
            const p = targetPoint(lv.data, Number(w.peso_neto), w.id, 1.47, w.fuera_de_rango)
            const m = new THREE.Mesh(punto, this.B[p.level])
            m.position.set(p.x, p.y, 0.01)
            if (w.id === this.selection.weighingId) m.scale.setScalar(2.1)
            this.dianaDots.add(m)
        }
    }

    // ================================================================ cámara

    private narrow() {
        return this.width < 700
    }

    private plantaRadius() {
        const ancho = Math.max(1, this.width - this.insets.right)
        const alto = Math.max(1, this.height - (this.insets.bottom + this.insets.top) * 0.9)
        const aspecto = ancho / alto
        const fondo = rowZ(this.maxRow) - rowZ(this.minRow) + TERR_D + 4.2
        return clamp(Math.max((BOARD_X1 - BOARD_X0 + 2) / (0.536 * aspecto), (fondo * 0.75) / 0.536) * 1.25, 30, 220)
    }

    private focusCamera(instantaneo: boolean) {
        const s = this.selection
        const lv = s.lotId !== null ? this.lots.get(s.lotId) : undefined
        const cv = s.clientId !== null ? this.clients.get(s.clientId) : undefined
        const k = this.narrow() ? 1.4 : 1
        if (lv) {
            this.goal.target.copy(lv.group.position).add(new V3(0, 1.3, 0))
            this.goal.r = (s.weighingId !== null ? 17 : 21) * k
            this.goal.el = Math.max(this.goal.el, 0.62)
        } else if (cv) {
            this.goal.target.set((STRIP_X0 + STRIP_X1) / 2, 0, rowZ(cv.row))
            this.goal.r = 42 * k
        } else {
            this.goal.target.set((BOARD_X0 + BOARD_X1) / 2 + 1, 0, this.stationZ())
            this.goal.r = this.plantaRadius()
            this.goal.el = 0.82
            this.goal.theta = 0.5
        }
        if (instantaneo) {
            this.cam.target.copy(this.goal.target)
            this.cam.r = this.goal.r
            this.cam.el = this.goal.el
            this.cam.theta = this.goal.theta
        }
    }

    private updateCamera(dt: number) {
        const k = 1 - Math.exp(-dt * (this.introDone ? 5.5 : 2.2))
        this.cam.target.lerp(this.goal.target, k)
        this.cam.theta += (this.goal.theta - this.cam.theta) * k
        this.cam.el += (this.goal.el - this.cam.el) * k
        this.cam.r += (this.goal.r - this.cam.r) * k
        const ce = Math.cos(this.cam.el)
        this.camera.position.set(
            this.cam.target.x + this.cam.r * ce * Math.sin(this.cam.theta),
            this.cam.target.y + this.cam.r * Math.sin(this.cam.el),
            this.cam.target.z + this.cam.r * ce * Math.cos(this.cam.theta),
        )
        this.camera.lookAt(this.cam.target)
    }

    private applyViewOffset() {
        const { top, right, bottom } = this.insets
        if (top || right || bottom) this.camera.setViewOffset(this.width, this.height, right / 2, (bottom - top) * 0.45, this.width, this.height)
        else this.camera.clearViewOffset()
    }

    private resize() {
        const w = this.host.clientWidth || 1
        const h = this.host.clientHeight || 1
        if (w === this.width && h === this.height) return
        this.width = w
        this.height = h
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.narrow() ? 1.5 : 2))
        // En pantallas chicas las sombras cuestan más de lo que aportan.
        if (this.renderer.shadowMap.enabled === this.narrow()) {
            this.renderer.shadowMap.enabled = !this.narrow()
            this.scene.traverse((o) => {
                const m = o as THREE.Mesh
                if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => { x.needsUpdate = true })
            })
        }
        this.renderer.setSize(w, h)
        this.camera.aspect = w / h
        this.applyViewOffset()
        this.camera.updateProjectionMatrix()
        if (this.selection.clientId === null) this.focusCamera(false)
    }

    private startIntro() {
        if (this.reduceMotion) { this.introDone = true; return }
        this.cam.r = this.goal.r * 1.9
        this.cam.theta = this.goal.theta + 1.1
        this.cam.el = 1.2
        this.cam.target.copy(this.goal.target).add(new V3(-6, 0, 0))
        this.lcdLabel.show = false
        const clientes = [...this.clients.values()].sort((a, b) => a.row - b.row)
        clientes.forEach((cv, i) => {
            window.setTimeout(() => {
                if (this.disposed) return
                this.tween(0.75, (t) => { cv.group.scale.y = Math.max(0.001, easeBack(t)) }, () => { cv.label.show = true })
                const suyos = [...this.lots.values()].filter((l) => l.clientId === cv.id)
                suyos.forEach((lv, j) => window.setTimeout(() => {
                    if (this.disposed) return
                    lv.group.visible = true
                    const y = lv.group.position.y
                    lv.group.position.y = y + 7
                    this.tween(0.6, (t) => { lv.group.position.y = y + 7 * (1 - t * t) }, () => { lv.group.position.y = y; this.ripple(lv.group.position, cv.color) })
                }, 380 + j * 110))
            }, 350 + i * 160)
        })
        window.setTimeout(() => {
            if (this.disposed) return
            this.lcdLabel.show = true
            this.introDone = true
            this.lots.forEach((lv) => { lv.group.visible = true })
            this.clients.forEach((cv) => { cv.group.scale.y = 1; cv.label.show = true })
        }, 350 + clientes.length * 160 + 1500)
    }

    // ================================================================ entrada

    private bindInput() {
        const canvas = this.renderer.domElement
        const on = <K extends keyof HTMLElementEventMap>(tipo: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
            canvas.addEventListener(tipo, fn as EventListener, opts)
            this.cleanups.push(() => canvas.removeEventListener(tipo, fn as EventListener, opts))
        }
        on('contextmenu', (e) => e.preventDefault())
        on('pointerdown', (e) => {
            canvas.setPointerCapture(e.pointerId)
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY })
            this.moved = false
            this.panMode = e.button === 2 || e.shiftKey
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()]
                this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), r0: this.goal.r, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
            }
        })
        on('pointermove', (e) => {
            const p = this.pointers.get(e.pointerId)
            if (!p) { this.hoverEvent = e; return }
            const dx = e.clientX - p.x
            const dy = e.clientY - p.y
            p.x = e.clientX
            p.y = e.clientY
            if (Math.hypot(p.x - p.sx, p.y - p.sy) > 5) this.moved = true
            if (!this.moved) return
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()]
                this.goal.r = clamp((this.pinch.r0 * this.pinch.d0) / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 8, 200)
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
                this.pan(mid.x - this.pinch.mid.x, mid.y - this.pinch.mid.y)
                this.pinch.mid = mid
            } else if (this.panMode) this.pan(dx, dy)
            else {
                this.goal.theta = clamp(this.goal.theta - dx * 0.005, -0.9, 1.6)
                this.goal.el = clamp(this.goal.el + dy * 0.004, 0.3, 1.32)
            }
        })
        const fin = (e: PointerEvent) => {
            const n = this.pointers.size
            this.pointers.delete(e.pointerId)
            if (e.type === 'pointerup' && !this.moved && n === 1) this.callbacks.onPick(this.pickAt(e.clientX, e.clientY))
        }
        on('pointerup', fin)
        on('pointercancel', fin)
        on('wheel', (e) => { e.preventDefault(); this.goal.r = clamp(this.goal.r * Math.exp(e.deltaY * 0.0012), 8, 200) }, { passive: false })
    }

    private pan(dx: number, dy: number) {
        const s = this.goal.r * 0.0016
        const derecha = new V3(Math.cos(this.goal.theta), 0, -Math.sin(this.goal.theta))
        const frente = new V3(Math.sin(this.goal.theta), 0, Math.cos(this.goal.theta))
        this.goal.target.addScaledVector(derecha, -dx * s).addScaledVector(frente, -dy * s * 1.4)
        this.goal.target.x = clamp(this.goal.target.x, BOARD_X0, BOARD_X1)
        this.goal.target.z = clamp(this.goal.target.z, rowZ(this.minRow) - 10, rowZ(this.maxRow) + 10)
    }

    private pickAt(cx: number, cy: number): PlantPickTarget | null {
        const r = this.renderer.domElement.getBoundingClientRect()
        this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
        this.raycaster.setFromCamera(this.ndc, this.camera)
        const objetos: THREE.Object3D[] = [this.platform]
        this.clients.forEach((cv) => objetos.push(...cv.picks))
        this.lots.forEach((lv) => objetos.push(...lv.picks))
        const hit = this.raycaster.intersectObjects(objetos, false)[0]
        if (!hit) return null
        const d = hit.object.userData as Partial<{ kind: PlantPickTarget['kind']; clientId: number; lotId: number; weighingId: number }>
        if (d.kind === 'cliente' && d.clientId !== undefined) return { kind: 'cliente', clientId: d.clientId }
        if (d.kind === 'lote' && d.clientId !== undefined && d.lotId !== undefined) return { kind: 'lote', clientId: d.clientId, lotId: d.lotId }
        if (d.kind === 'pesaje' && d.clientId !== undefined && d.lotId !== undefined && d.weighingId !== undefined) return { kind: 'pesaje', clientId: d.clientId, lotId: d.lotId, weighingId: d.weighingId }
        if (d.kind === 'bascula') return { kind: 'bascula' }
        return null
    }

    private processHover() {
        if (!this.hoverEvent) return
        const e = this.hoverEvent
        this.hoverEvent = null
        const h = this.pickAt(e.clientX, e.clientY)
        this.renderer.domElement.style.cursor = h ? 'pointer' : 'grab'
        const cliente = h && 'clientId' in h ? h.clientId : null
        if (cliente !== this.hoverClientId) { this.hoverClientId = cliente; this.refreshSelectionVisuals() }
    }

    // ================================================================ etiquetas

    private addLabel(clases: string, pos: () => THREE.Vector3, onClick?: () => void): Label {
        const el = document.createElement('div')
        el.className = `absolute left-0 top-0 whitespace-nowrap will-change-transform ${clases}`
        this.labelsLayer.appendChild(el)
        if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
        const label: Label = { el, pos, show: true }
        this.labels.push(label)
        return label
    }

    private removeLabel(label: Label) {
        label.el.remove()
        const i = this.labels.indexOf(label)
        if (i >= 0) this.labels.splice(i, 1)
    }

    private readonly proyeccion = new V3()

    private updateLabels() {
        for (const l of this.labels) {
            if (!l.show) { l.el.style.visibility = 'hidden'; continue }
            this.proyeccion.copy(l.pos()).project(this.camera)
            if (this.proyeccion.z > 1) { l.el.style.visibility = 'hidden'; continue }
            l.el.style.visibility = ''
            const x = ((this.proyeccion.x + 1) / 2) * this.width
            const y = ((1 - this.proyeccion.y) / 2) * this.height
            l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`
        }
    }

    // ================================================================ animación

    private tween(dur: number, fn: (p: number) => void, done?: () => void) {
        if (this.reduceMotion) { fn(1); done?.(); return }
        this.tweens.push({ t: 0, dur, fn, done })
    }

    private ripple(pos: THREE.Vector3, color: string) {
        if (this.reduceMotion) return
        const mesh = new THREE.Mesh(
            new THREE.RingGeometry(0.9, 1.0, 56).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
        )
        mesh.position.copy(pos).setY(pos.y + 0.02)
        this.scene.add(mesh)
        this.ripples.push({ mesh, t: 0 })
    }

    private start() {
        if (this.running || this.disposed) return
        this.running = true
        this.last = performance.now()
        const frame = (now: number) => {
            if (!this.running) return
            this.tick(Math.min(0.05, (now - this.last) / 1000))
            this.last = now
            this.raf = requestAnimationFrame(frame)
        }
        this.raf = requestAnimationFrame(frame)
    }

    private stop() {
        this.running = false
        cancelAnimationFrame(this.raf)
    }

    private tick(dt: number) {
        this.time += dt

        for (let i = this.tweens.length - 1; i >= 0; i--) {
            const w = this.tweens[i]
            w.t += dt
            const p = Math.min(1, w.t / w.dur)
            w.fn(p)
            if (p >= 1) { this.tweens.splice(i, 1); w.done?.() }
        }

        this.updateCamera(dt)
        this.processWeighQueue()

        const mov = this.reduceMotion ? 0 : 1
        this.clients.forEach((cv) => { if (cv.flowMat.map) cv.flowMat.map.offset.x -= dt * 0.55 * mov })

        // En el nivel Lote la miga de pan ya nombra al cliente, y su etiqueta taparía la diana.
        if (this.introDone) this.clients.forEach((cv) => { cv.label.show = this.selection.lotId === null })

        this.lots.forEach((lv) => {
            if (lv.pulse) (lv.pulse.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(this.time * 3.2) * 0.35 * mov
            if (lv.spin) { lv.spin.rotation.y += dt * 1.6 * mov; lv.spin.position.y = lv.topY + 0.55 + Math.sin(this.time * 2.4) * 0.08 * mov }
            const mostrar = this.introDone && (this.selection.clientId === lv.clientId || this.hoverClientId === lv.clientId || this.selection.lotId === lv.id)
            if (this.introDone) {
                lv.label.show = mostrar
            }
            for (const { person, kind } of lv.people) this.animateLotPerson(person, kind, dt)
        })

        const sel = this.selection.lotId !== null ? this.lots.get(this.selection.lotId) : undefined
        if (sel) {
            this.selRing.position.copy(sel.group.position).setY(sel.group.position.y + 0.012)
            this.selRing.scale.setScalar(1 + Math.sin(this.time * 3) * 0.035 * mov)
            if (this.diana.visible) {
                const alto = 1.9
                this.diana.position.set(sel.group.position.x, sel.group.position.y + sel.topY + alto, sel.group.position.z)
                this.diana.rotation.y = this.cam.theta
                this.dianaTilt.rotation.x = -Math.PI / 2 + 0.62
                this.dianaStem.scale.y = alto - 0.05
                this.dianaStem.position.y = -alto / 2 - 0.02
            }
        }

        this.animateAmbient(dt, mov)

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i]
            r.t += dt
            const p = r.t / 0.9
            r.mesh.scale.setScalar(1 + p * 1.6)
            r.mesh.material.opacity = 0.9 * (1 - p)
            if (p >= 1) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); this.ripples.splice(i, 1) }
        }

        this.processHover()
        this.renderer.render(this.scene, this.camera)
        this.updateLabels()
    }

    private animateLotPerson(p: Person, kind: LotPerson['kind'], dt: number) {
        if (this.reduceMotion) return
        if (kind === 'estibador') {
            if (p.action > 0) {
                p.action -= dt
                const s = Math.sin((1 - p.action / 0.8) * Math.PI)
                p.armL.rotation.x = p.armR.rotation.x = -s * 1.5
                p.body.rotation.x = s * 0.22
            } else {
                p.armL.rotation.x = p.armR.rotation.x = Math.sin(this.time * 1.2 + p.phase) * 0.06
                p.body.rotation.x = 0
                p.body.rotation.y = Math.sin(this.time * 0.6 + p.phase) * 0.2
            }
        } else if (kind === 'supervisor') {
            p.body.rotation.y = Math.sin(this.time * 0.7 + p.phase) * 0.3
            p.armR.rotation.x = -0.95 + Math.sin(this.time * 1.3 + p.phase) * 0.06
            p.armL.rotation.x = Math.sin(this.time * 0.9 + p.phase) * 0.12
        } else {
            p.armL.rotation.x = -2.4 + Math.sin(this.time * 4 + p.phase) * 0.45
            p.armR.rotation.x = -0.2
        }
    }

    private animateAmbient(dt: number, mov: number) {
        this.ambient.visible = this.introDone
        if (!mov) return
        for (const w of this.walkers) {
            if (w.wait > 0) { w.wait -= dt; walkPose(w.person, this.time, 0); continue }
            w.x += w.dir * w.speed * dt
            if (w.x > STRIP_X1 - 0.6 || w.x < 1) { w.dir *= -1; w.x = clamp(w.x, 1, STRIP_X1 - 0.6) }
            if (Math.random() < dt * 0.05) w.wait = 1.2 + Math.random() * 2.4
            w.person.root.position.set(w.x, 0, w.z)
            w.person.root.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2
            walkPose(w.person, this.time, 1)
        }
        for (const c of this.pushers) {
            if (c.wait > 0) { c.wait -= dt; walkPose(c.person, this.time, 0); continue }
            const destino = c.points[c.index]
            const dx = destino.x - c.pos.x
            const dz = destino.z - c.pos.z
            const d = Math.hypot(dx, dz)
            if (d < 0.05) {
                c.index = (c.index + 1) % c.points.length
                if (c.index === 1 || c.index === 3) c.wait = 1.2 + Math.random() * 1.8
                continue
            }
            const paso = Math.min(d, c.speed * dt)
            c.pos.x += (dx / d) * paso
            c.pos.z += (dz / d) * paso
            let giro = Math.atan2(dx, dz) - c.root.rotation.y
            giro = Math.atan2(Math.sin(giro), Math.cos(giro))
            c.root.rotation.y += giro * Math.min(1, dt * 6)
            c.root.position.set(c.pos.x, 0, c.pos.z)
            walkPose(c.person, this.time, 1)
        }
        this.chatters.forEach((p, k) => {
            p.body.rotation.y = Math.sin(this.time * 0.8 + k * 2) * 0.25
            p.body.position.y = Math.abs(Math.sin(this.time * 1.5 + k)) * 0.012
            if (k === 1) { p.armR.rotation.x = -0.6 + Math.sin(this.time * 3.2) * 0.45; p.armR.rotation.z = 0.25 }
            else p.armL.rotation.x = p.armR.rotation.x = Math.sin(this.time * 1.1 + k) * 0.06
        })
        for (const p of [this.operario, this.ayudante]) {
            if (p.action > 0) {
                p.action -= dt
                const s = Math.sin(Math.min(1, 1 - p.action / 1.2) * Math.PI)
                if (p === this.operario) { p.armL.rotation.x = p.armR.rotation.x = -s * 1.1; p.body.rotation.x = s * 0.12 }
                else p.body.rotation.x = s * 0.35
            } else {
                if (p === this.operario) p.armL.rotation.x = p.armR.rotation.x = Math.sin(this.time * 1.1) * 0.05
                else { p.armL.rotation.x = p.armR.rotation.x = -1.15; p.body.rotation.y = Math.sin(this.time * 0.5) * 0.15 }
                p.body.rotation.x = 0
            }
        }
    }
}
