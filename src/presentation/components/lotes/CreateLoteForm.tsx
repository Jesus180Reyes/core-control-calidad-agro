import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import type { CreateLoteSchema } from '#/presentation/schema/crear-lote/crearLoteSchema'
import { useGetCatalogosUnidadMedida } from '#/presentation/hooks/catalogos/useGetCatalogosUnidadMedida'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import { useGetCatalogosOrigenes } from '#/presentation/hooks/catalogos/useGetCatalogosOrigenes'
import { CreateOrigenDialog } from '#/presentation/components/origenes/CreateOrigenDialog'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'

export const CREATE_LOTE_FORM_ID = 'form-crear-lote'



export function CreateLoteForm() {
    const { control, setValue } = useFormContext<CreateLoteSchema>()
    const [createOrigenOpen, setCreateOrigenOpen] = useState(false)
    const { unidadesMedidas } = useGetCatalogosUnidadMedida();
    const { productos } = useGetCatalogosProductos();
    const { origenes } = useGetCatalogosOrigenes();

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
            <div className="space-y-2">
                <ControlledSelector
                    control={control}
                    name="origen_id"
                    label="Origen"
                    placeholder="Elegí el origen (opcional)"
                    options={origenes.map(item => ({ value: item.id, label: item.nombre }))}
                    valueAsNumber
                    showSearch
                    searchPlaceholder="Buscar origen..."
                    emptyMessage="Todavía no hay orígenes"
                />
                {/* `type="button"`: un submit acá enviaría el formulario del lote. */}
                <CustomButton
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    icon={<Plus className="size-4" />}
                    onClick={() => setCreateOrigenOpen(true)}
                >
                    Crear origen
                </CustomButton>
            </div>
            <CreateOrigenDialog
                open={createOrigenOpen}
                onOpenChange={setCreateOrigenOpen}
                onCreated={(origenId) => setValue('origen_id', origenId, { shouldValidate: true })}
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
