import { describe, expect, it } from 'vitest'
import { MAXIMO_DEL_TURNO, TURNOS_DE_HISTORIAL, aHistorial, withSuggestions } from './agriHistory'
import type { AgriMessage } from '#/presentation/types/agri/agri.types'

const FRASE =
    'No me quedo del todo claro que quieres ver. Elige una de estas preguntas o escribela con tus palabras.'

let siguienteId = 0

function mensaje(role: AgriMessage['role'], content: string, suggestions?: string[]): AgriMessage {
    siguienteId += 1
    const base: AgriMessage = { id: `m-${siguienteId}`, role, content }
    return suggestions === undefined ? base : { ...base, suggestions }
}

describe('withSuggestions', () => {
    it('sin sugerencias devuelve el texto intacto', () => {
        expect(withSuggestions('Hola', undefined)).toBe('Hola')
        expect(withSuggestions('Hola', [])).toBe('Hola')
    })

    it('con sugerencias agrega una línea en blanco y una línea "- " por pregunta', () => {
        expect(withSuggestions('Frase', ['A?', 'B?'])).toBe('Frase\n\n- A?\n- B?')
    })
})

describe('aHistorial', () => {
    it('un mensaje de Agri con sugerencias viaja como asistente, con las preguntas', () => {
        const sugerencias = ['¿Qué lotes de Agroexport están abiertos?', '¿Qué se pesó hoy de Agroexport?']

        expect(aHistorial([mensaje('agri', FRASE, sugerencias)])).toEqual([
            {
                rol: 'asistente',
                contenido: `${FRASE}\n\n- ¿Qué lotes de Agroexport están abiertos?\n- ¿Qué se pesó hoy de Agroexport?`,
            },
        ])
    })

    it('los mensajes del usuario y los de Agri sin sugerencias salen igual que antes', () => {
        const historial = aHistorial([
            mensaje('user', '  cómo va lo de Agroexport  '),
            mensaje('agri', '**Tres** lotes abiertos.'),
            mensaje('agri', 'Sin sugerencias.', []),
        ])

        expect(historial).toEqual([
            { rol: 'usuario', contenido: 'cómo va lo de Agroexport' },
            { rol: 'asistente', contenido: '**Tres** lotes abiertos.' },
            { rol: 'asistente', contenido: 'Sin sugerencias.' },
        ])
    })

    it('descarta los turnos vacíos', () => {
        expect(aHistorial([mensaje('user', '   '), mensaje('agri', '')])).toEqual([])
    })

    it(`manda sólo los últimos ${TURNOS_DE_HISTORIAL} turnos`, () => {
        const mensajes = Array.from({ length: 15 }, (_, i) =>
            mensaje(i % 2 === 0 ? 'user' : 'agri', `turno ${i}`),
        )

        const historial = aHistorial(mensajes)

        expect(historial).toHaveLength(TURNOS_DE_HISTORIAL)
        expect(historial[0].contenido).toBe('turno 5')
        expect(historial.at(-1)?.contenido).toBe('turno 14')
    })

    it(`recorta cada contenido a ${MAXIMO_DEL_TURNO} caracteres, con las preguntas ya agregadas`, () => {
        const largo = 'a'.repeat(MAXIMO_DEL_TURNO + 100)

        const [delUsuario, deAgri] = aHistorial([
            mensaje('user', largo),
            mensaje('agri', 'b'.repeat(MAXIMO_DEL_TURNO - 5), ['Una pregunta larga?']),
        ])

        expect(delUsuario.contenido).toHaveLength(MAXIMO_DEL_TURNO)
        expect(deAgri.contenido).toHaveLength(MAXIMO_DEL_TURNO)
        // 3995 + '\n\n- ' son 3999: el corte se come la pregunta después de su primera letra.
        expect(deAgri.contenido.endsWith('\n\n- U')).toBe(true)
    })
})
