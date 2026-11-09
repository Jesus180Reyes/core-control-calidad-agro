// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManualProbe } from '#/presentation/hooks/bascula/useSelectorBascula'
import { ManualScaleProfileForm } from './ManualScaleProfileForm'

const INPUT = { baudRate: 9600, byteFormat: '8N1', mode: 'continuo', pollCommand: null, frameFormat: 'texto' } as const

const montar = (probe: ManualProbe | null = null, probing = false) => {
    const props = {
        probing,
        probe,
        onProbe: vi.fn(),
        onDiscardProbe: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
    }
    render(<ManualScaleProfileForm {...props} />)
    return props
}

const boton = (nombre: string) => screen.getByRole('button', { name: nombre })

afterEach(() => {
    cleanup()
})

describe('ManualScaleProfileForm', () => {
    it('Guardar está deshabilitado sin prueba', () => {
        montar()
        expect(boton('Guardar')).toHaveProperty('disabled', true)
    })

    it('Probar manda los valores del formulario, sin comando en modo continuo', async () => {
        const props = montar()
        fireEvent.click(boton('Probar'))
        await waitFor(() => { expect(props.onProbe).toHaveBeenCalledWith(INPUT) })
    })

    it('una prueba sin peso muestra las líneas crudas y deja Guardar deshabilitado', () => {
        montar({ input: INPUT, result: { lines: ['\u0002#@!\u0003'], peso: null, unidad: null, terminator: '\r\n' } })

        expect(screen.getByText('·#@!·')).toBeTruthy()
        expect(screen.getByText('No se leyó ningún peso. Revise los datos y pruebe de nuevo.')).toBeTruthy()
        expect(boton('Guardar')).toHaveProperty('disabled', true)
    })

    it('una prueba con peso habilita Guardar', () => {
        const props = montar({ input: INPUT, result: { lines: ['  12.50 kg'], peso: 12.5, unidad: 'kg', terminator: '\r\n' } })

        expect(screen.getByText(/^Peso leído: 12[.,]5 kg$/)).toBeTruthy()
        fireEvent.click(boton('Guardar'))
        expect(props.onSave).toHaveBeenCalled()
    })

    it('mientras prueba, Guardar sigue deshabilitado', () => {
        montar({ input: INPUT, result: { lines: ['  12.50 kg'], peso: 12.5, unidad: 'kg', terminator: '\r\n' } }, true)
        expect(boton('Guardar')).toHaveProperty('disabled', true)
    })

    it('Volver avisa al dialog', () => {
        const props = montar()
        fireEvent.click(boton('Volver'))
        expect(props.onBack).toHaveBeenCalled()
    })
})
