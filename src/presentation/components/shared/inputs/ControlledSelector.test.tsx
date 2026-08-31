// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useForm } from 'react-hook-form'

import { ControlledSelector } from './ControlledSelector'

interface Formulario {
    producto_id: number
}

const OPCIONES_TEXTO = [
    { value: '1', label: 'Producto 1' },
    { value: '7', label: 'Producto 7' },
]

/** Como las arma un hook de dominio a partir de ids del backend. */
const OPCIONES_ID = [
    { value: 1, label: 'Producto 1' },
    { value: 7, label: 'Producto 7' },
]

/** Espeja el valor del form para poder afirmar sobre lo que guardó el `control`. */
function Formulario({
    valueAsNumber = false,
    showSearch = false,
    options = OPCIONES_TEXTO
}: {
    valueAsNumber?: boolean
    showSearch?: boolean
    options?: { value: number | string, label: string }[]
}) {
    const { control, watch } = useForm<Formulario>()
    const valor = watch('producto_id')

    return (
        <>
            <ControlledSelector
                control={control}
                name="producto_id"
                label="Producto"
                options={options}
                valueAsNumber={valueAsNumber}
                showSearch={showSearch}
            />
            <span data-testid="valor">{JSON.stringify(valor)}</span>
            <span data-testid="tipo">{typeof valor}</span>
        </>
    )
}

/** base-ui escucha eventos de puntero: un `click` pelado no alcanza. */
const apuntarYSoltar = (elemento: HTMLElement) => {
    fireEvent.pointerDown(elemento, { pointerType: 'mouse', button: 0 })
    fireEvent.mouseDown(elemento, { button: 0 })
    fireEvent.pointerUp(elemento, { pointerType: 'mouse', button: 0 })
    fireEvent.mouseUp(elemento, { button: 0 })
    fireEvent.click(elemento, { button: 0 })
}

const elegirProducto7 = async () => {
    apuntarYSoltar(screen.getByRole('combobox'))
    const opcion = await screen.findByRole('option', { name: 'Producto 7' })
    apuntarYSoltar(opcion)
}

afterEach(cleanup)

describe('ControlledSelector', () => {
    it('guarda en el control el value de la opción elegida', async () => {
        render(<Formulario />)

        await elegirProducto7()

        await waitFor(() => {
            expect(screen.getByTestId('valor').textContent).toBe('"7"')
        })
        expect(screen.getByTestId('tipo').textContent).toBe('string')
    })

    it('con `valueAsNumber` guarda el id como número', async () => {
        render(<Formulario valueAsNumber />)

        await elegirProducto7()

        await waitFor(() => {
            expect(screen.getByTestId('valor').textContent).toBe('7')
        })
        expect(screen.getByTestId('tipo').textContent).toBe('number')
    })

    // Con opciones de id numérico, la primitiva empareja el valor de la raíz con el
    // del item por `Object.is`: si no se normalizan los dos al mismo tipo, `'7'`
    // contra `7` no da, y al reabrir no queda ninguna opción marcada.
    it('marca la opción elegida al reabrir después de buscar', async () => {
        render(<Formulario valueAsNumber showSearch options={OPCIONES_ID} />)

        apuntarYSoltar(screen.getByRole('combobox'))
        fireEvent.change(await screen.findByPlaceholderText('Buscar...'), {
            target: { value: 'Producto 7' }
        })
        apuntarYSoltar(await screen.findByRole('option', { name: 'Producto 7' }))

        await waitFor(() => {
            expect(screen.getByTestId('valor').textContent).toBe('7')
        })

        apuntarYSoltar(screen.getByRole('combobox'))

        await waitFor(() => {
            const elegida = screen.getByRole('option', { name: 'Producto 7' })
            expect(elegida.getAttribute('aria-selected')).toBe('true')
        })
        const otra = screen.getByRole('option', { name: 'Producto 1' })
        expect(otra.getAttribute('aria-selected')).toBe('false')
    })
})
