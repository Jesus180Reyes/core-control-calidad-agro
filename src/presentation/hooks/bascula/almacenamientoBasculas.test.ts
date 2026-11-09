// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScaleProfile } from '#/presentation/types/control-calidad/perfil-bascula.types'
import { readProfile, readProfiles, saveProfile } from './almacenamientoBasculas'

const PROFILES_KEY = 'bascula-perfil:v1'

const perfil = (cambios: Partial<ScaleProfile> = {}): ScaleProfile => ({
    version: 1,
    baudRate: 2400,
    byteFormat: '7E1',
    mode: 'continuo',
    pollCommand: null,
    frameFormat: 'texto',
    terminator: '\r\n',
    unit: 'lb',
    source: 'auto',
    detectedAt: '2026-11-07T14:02:11.000Z',
    ...cambios,
})

const guardarCrudo = (valor: unknown) =>
    localStorage.setItem(PROFILES_KEY, typeof valor === 'string' ? valor : JSON.stringify(valor))

afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('perfiles de báscula en localStorage', () => {
    it('sin nada guardado no hay perfiles', () => {
        expect(readProfiles()).toEqual({})
        expect(readProfile('0403:6001')).toBeNull()
    })

    it('guarda y lee un perfil válido', () => {
        saveProfile('0403:6001', perfil())
        expect(readProfile('0403:6001')).toEqual(perfil())
        expect(JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}')).toEqual({ '0403:6001': perfil() })
    })

    it('guardar un perfil conserva los de otras básculas y reemplaza el propio', () => {
        saveProfile('0403:6001', perfil())
        saveProfile('067b:2303', perfil({ baudRate: 9600, byteFormat: '8N1' }))
        saveProfile('0403:6001', perfil({ baudRate: 4800, source: 'manual' }))

        expect(readProfiles()).toEqual({
            '0403:6001': perfil({ baudRate: 4800, source: 'manual' }),
            '067b:2303': perfil({ baudRate: 9600, byteFormat: '8N1' }),
        })
    })

    it('lee un perfil en modo consulta con su comando', () => {
        const consulta = perfil({ mode: 'consulta', pollCommand: 'sics', unit: null })
        saveProfile('0403:6001', consulta)
        expect(readProfile('0403:6001')).toEqual(consulta)
    })

    it('descarta un perfil con versión distinta y conserva los demás', () => {
        guardarCrudo({ '0403:6001': { ...perfil(), version: 2 }, '067b:2303': perfil() })
        expect(readProfiles()).toEqual({ '067b:2303': perfil() })
        expect(readProfile('0403:6001')).toBeNull()
    })

    it.each([
        ['velocidad no numérica', { baudRate: '9600' }],
        ['formato del byte desconocido', { byteFormat: '8E1' }],
        ['formato de trama desconocido', { frameFormat: 'binario' }],
        ['terminador desconocido', { terminator: ';' }],
        ['unidad desconocida', { unit: 'ton' }],
        ['consulta sin comando', { mode: 'consulta', pollCommand: null }],
        ['continuo con comando', { pollCommand: 'sics' }],
        ['fecha inválida', { detectedAt: 'ayer' }],
        ['origen desconocido', { source: 'importado' }],
    ])('descarta un perfil con %s', (_caso, cambios) => {
        guardarCrudo({ '0403:6001': { ...perfil(), ...cambios } })
        expect(readProfile('0403:6001')).toBeNull()
    })

    it('un JSON corrupto se lee como sin perfiles', () => {
        guardarCrudo('{"0403:6001": {"version": 1,')
        expect(readProfiles()).toEqual({})
    })

    it('un valor que no es objeto se lee como sin perfiles', () => {
        guardarCrudo([perfil()])
        expect(readProfiles()).toEqual({})
    })

    it('guardar sobre un JSON corrupto lo reemplaza', () => {
        guardarCrudo('no es json')
        saveProfile('0403:6001', perfil())
        expect(readProfiles()).toEqual({ '0403:6001': perfil() })
    })

    it('si localStorage falla, leer no rompe y guardar no lanza', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('cuota') })

        expect(readProfiles()).toEqual({})
        expect(() => saveProfile('0403:6001', perfil())).not.toThrow()
    })
})
