import { useFormContext } from 'react-hook-form'

import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import type { CreateLoteSchema } from '#/presentation/schema/crear-lote/crearLoteSchema'
import { useGetCatalogosUnidadMedida } from '#/presentation/hooks/catalogos/useGetCatalogosUnidadMedida'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'

export const CREATE_LOTE_FORM_ID = 'form-crear-lote'



export function CreateLoteForm() {
    const { control } = useFormContext<CreateLoteSchema>()
    const { unidadesMedidas } = useGetCatalogosUnidadMedida();
    const { productos } = useGetCatalogosProductos();

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <ControlledInput
                    control={control}
                    name="nombre_lote"
                    label="Nombre del lote"
                    placeholder="LOTE-001"
                    uppercase
                />
                <ControlledInput
                    control={control}
                    name="variedad_o_talla"
                    label="Variedad o talla"
                    placeholder="Calibre 18"
                />
            </div>

            <ControlledSelector
                control={control}
                name="unidad_medida_id"
                label="Unidad de medida"
                placeholder="Elegí la unidad"
                options={unidadesMedidas.map(item => ({ value: item.id, label: item.nombre }))}
                valueAsNumber
            />
            <ControlledSelector
                control={control}
                name="producto_id"
                label="Producto"
                placeholder="Elegí el producto"
                options={productos.map(item => ({ value: item.id, label: item.nombre }))}
                valueAsNumber
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <ControlledInput
                    control={control}
                    name="peso_minimo"
                    label="Peso mínimo"
                    type="number"
                    placeholder="0"
                    valueAsNumber
                />
                <ControlledInput
                    control={control}
                    name="peso_ideal"
                    label="Peso ideal"
                    type="number"
                    placeholder="0"
                    valueAsNumber
                />
                <ControlledInput
                    control={control}
                    name="peso_maximo"
                    label="Peso máximo"
                    type="number"
                    placeholder="0"
                    valueAsNumber
                />
            </div>
        </>
    )
}
