// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumns } from './DataTable'

interface Pesaje {
    id: string
    cliente: string
    peso: number
}

const PESAJES: Pesaje[] = [
    { id: 'a', cliente: 'Beta', peso: 300 },
    { id: 'b', cliente: 'Alfa', peso: 100 },
    { id: 'c', cliente: 'Gamma', peso: 200 },
]

/**
 * `cliente` no declara `enableSorting`: el orden es opt-in, así que esa columna
 * queda sin ordenar y sirve para probar las dos ramas del header.
 */
const COLUMNAS: DataTableColumns<Pesaje> = [
    { accessorKey: 'cliente', header: 'Cliente' },
    {
        accessorKey: 'peso',
        header: 'Peso',
        enableSorting: true,
        meta: { align: 'right' },
    },
]

const obtenerId = (pesaje: Pesaje) => pesaje.id

/** Las filas de datos, sin la del header. */
function filasDeDatos(): HTMLElement[] {
    return screen.getAllByRole('row').slice(1)
}

/** El contenido de la columna `peso`, en el orden en que está pintado. */
function pesosPintados(): (string | null)[] {
    return filasDeDatos().map((fila) => fila.querySelectorAll('td')[1].textContent)
}

function headerDe(texto: string): HTMLTableCellElement {
    return screen.getByText(texto).closest('th')!
}

afterEach(cleanup)

describe('render', () => {
    it('pinta un th por columna y una fila por elemento de data', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        expect(screen.getAllByRole('columnheader')).toHaveLength(2)
        expect(filasDeDatos()).toHaveLength(3)
    })

    it('una celda con `cell` propio renderiza el nodo devuelto, no el valor crudo', () => {
        const columnas: DataTableColumns<Pesaje> = [
            {
                accessorKey: 'peso',
                header: 'Peso',
                cell: ({ row }) => (
                    <strong data-testid="peso">
                        {row.original.peso.toFixed(2)} kg
                    </strong>
                ),
            },
        ]

        render(<DataTable data={PESAJES} columns={columnas} getRowId={obtenerId} />)

        expect(screen.getAllByTestId('peso')[0].textContent).toBe('300.00 kg')
        expect(screen.queryByText('300')).toBeNull()
    })

    it('aplica `meta.align` al header y a la celda', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        expect(headerDe('Peso').className).toContain('text-right')

        const celda = filasDeDatos()[0].querySelectorAll('td')[1]
        expect(celda.className).toContain('text-right')
    })
})

describe('ordenamiento', () => {
    it('el primer click ordena ascendente y el segundo invierte el orden', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        expect(pesosPintados()).toEqual(['300', '100', '200'])

        const boton = headerDe('Peso').querySelector('button')!

        fireEvent.click(boton)
        expect(pesosPintados()).toEqual(['100', '200', '300'])

        fireEvent.click(boton)
        expect(pesosPintados()).toEqual(['300', '200', '100'])
    })

    it('un header no ordenable no renderiza button ni expone aria-sort', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        const header = headerDe('Cliente')

        expect(header.querySelector('button')).toBeNull()
        expect(header.getAttribute('aria-sort')).toBeNull()
    })

    it('aria-sort refleja el estado y el tercer click vuelve al orden original', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        const header = headerDe('Peso')
        const boton = header.querySelector('button')!

        expect(header.getAttribute('aria-sort')).toBe('none')

        fireEvent.click(boton)
        expect(header.getAttribute('aria-sort')).toBe('ascending')

        fireEvent.click(boton)
        expect(header.getAttribute('aria-sort')).toBe('descending')

        fireEvent.click(boton)
        expect(header.getAttribute('aria-sort')).toBe('none')
        expect(pesosPintados()).toEqual(['300', '100', '200'])
    })

    it('`defaultSorting` arranca con las filas ya ordenadas', () => {
        render(
            <DataTable
                data={PESAJES}
                columns={COLUMNAS}
                getRowId={obtenerId}
                defaultSorting={[{ id: 'peso', desc: true }]}
            />,
        )

        expect(pesosPintados()).toEqual(['300', '200', '100'])
        expect(headerDe('Peso').getAttribute('aria-sort')).toBe('descending')
    })
})

describe('fila clickeable', () => {
    it('`onRowClick` se dispara con el objeto original de la fila', () => {
        const alClickear = vi.fn()

        render(
            <DataTable
                data={PESAJES}
                columns={COLUMNAS}
                getRowId={obtenerId}
                onRowClick={alClickear}
            />,
        )

        fireEvent.click(screen.getByText('Alfa').closest('tr')!)

        expect(alClickear).toHaveBeenCalledTimes(1)
        expect(alClickear).toHaveBeenCalledWith(PESAJES[1])
    })

    it('Enter y Espacio sobre una fila enfocada disparan el callback', () => {
        const alClickear = vi.fn()

        render(
            <DataTable
                data={PESAJES}
                columns={COLUMNAS}
                getRowId={obtenerId}
                onRowClick={alClickear}
            />,
        )

        const fila = screen.getByText('Alfa').closest('tr')!

        expect(fila.getAttribute('tabindex')).toBe('0')

        fireEvent.keyDown(fila, { key: 'Enter' })
        fireEvent.keyDown(fila, { key: ' ' })
        expect(alClickear).toHaveBeenCalledTimes(2)

        // Cualquier otra tecla no hace nada.
        fireEvent.keyDown(fila, { key: 'a' })
        expect(alClickear).toHaveBeenCalledTimes(2)
    })

    it('las filas conservan el rol `row`: la tabla no pierde su semántica', () => {
        render(
            <DataTable
                data={PESAJES}
                columns={COLUMNAS}
                getRowId={obtenerId}
                onRowClick={vi.fn()}
            />,
        )

        // 1 header + 3 filas de datos: ninguna perdió su rol implícito.
        expect(screen.getAllByRole('row')).toHaveLength(4)

        for (const fila of filasDeDatos()) {
            expect(fila.getAttribute('role')).toBeNull()
        }
    })

    it('sin `onRowClick`, las filas no tienen tabIndex ni cursor', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        for (const fila of filasDeDatos()) {
            expect(fila.getAttribute('tabindex')).toBeNull()
            expect(fila.className).not.toContain('cursor-pointer')

            // Ni click ni teclado hacen nada: no hay handler que disparar.
            fireEvent.click(fila)
            fireEvent.keyDown(fila, { key: 'Enter' })
        }
    })
})

describe('estado vacío', () => {
    it('pinta el estado vacío con el texto recibido y ninguna fila de datos', () => {
        render(
            <DataTable
                data={[]}
                columns={COLUMNAS}
                emptyTitle="No hay pesajes"
                emptyDescription="Cargá el primero desde la báscula."
            />,
        )

        expect(screen.getByText('No hay pesajes')).toBeTruthy()
        expect(screen.getByText('Cargá el primero desde la báscula.')).toBeTruthy()

        // Los headers se siguen pintando: sin ellos nadie sabe qué está vacío.
        expect(screen.getAllByRole('columnheader')).toHaveLength(2)

        // La única fila del cuerpo es la del estado vacío, a todo el ancho.
        expect(filasDeDatos()).toHaveLength(1)
        expect(
            screen.getByText('No hay pesajes').closest('td')!.getAttribute('colspan'),
        ).toBe('2')
    })

    it('sin textos propios usa el título por defecto', () => {
        render(<DataTable data={[]} columns={COLUMNAS} />)

        expect(screen.getByText('No hay registros')).toBeTruthy()
    })

    it('con datos no aparece el estado vacío', () => {
        render(<DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />)

        expect(screen.queryByText('No hay registros')).toBeNull()
    })
})

describe('getRowId', () => {
    it('reordenar el array no remonta las filas', () => {
        const { rerender } = render(
            <DataTable data={PESAJES} columns={COLUMNAS} getRowId={obtenerId} />,
        )

        const filaAlfa = screen.getByText('Alfa').closest('tr')!

        rerender(
            <DataTable
                data={[...PESAJES].reverse()}
                columns={COLUMNAS}
                getRowId={obtenerId}
            />,
        )

        // Mismo nodo del DOM: React reusó la fila porque su key no cambió.
        expect(screen.getByText('Alfa').closest('tr')).toBe(filaAlfa)
    })
})
