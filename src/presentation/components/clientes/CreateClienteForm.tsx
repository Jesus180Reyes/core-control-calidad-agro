import { useFormContext } from 'react-hook-form'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledMultiSelector } from '#/presentation/components/shared/inputs/ControlledMultiSelector'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import {
    type CreateClienteSchema,
} from '#/presentation/schema/crear-cliente/crearClienteSchema'
import { useGetCatalogosProductos } from '#/presentation/hooks/catalogos/useGetCatalogosProductos'
import { useGetCatalogosOperadores } from '#/presentation/hooks/catalogos/useGetCatalogosOperadores'

export const CREATE_CLIENTE_FORM_ID = 'form-crear-cliente'



export function CreateClienteForm() {
    const { control } = useFormContext<CreateClienteSchema>()
    const { productos } = useGetCatalogosProductos();
    const { operadores } = useGetCatalogosOperadores();

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <ControlledInput
                    control={control}
                    name="nombre"
                    label="Nombre"
                    placeholder="Agroexportadora S.A."
                />
                <ControlledInput
                    control={control}
                    name="rtn"
                    label="Identificación fiscal"
                    placeholder="08011999123456"
                />
                <ControlledInput
                    control={control}
                    name="codigo_exportacion"
                    label="Código de exportación"
                    placeholder="EXP-001"
                    uppercase
                />
                <ControlledInput
                    control={control}
                    name="correo_contacto"
                    label="Correo de contacto"
                    type="email"
                    placeholder="contacto@cliente.com"
                />
                <ControlledInput
                    control={control}
                    name="telefono"
                    label="Teléfono"
                    type="tel"
                    placeholder="+504 9999-9999"
                />
                <ControlledInput
                    control={control}
                    name="direccion_planta"
                    label="Dirección de planta"
                    placeholder="Km 12 carretera al norte"
                />
            </div>
            <ControlledSelector
                control={control}
                name="producto_id"
                label="Producto"
                placeholder="Elegí el producto"
                options={productos.map(item => ({ value: item.id, label: item.nombre }))}
                valueAsNumber
                showSearch
            />
            <ControlledMultiSelector
                control={control}
                name="usuario_ids"
                label="Operadores que estaran vinculados a este cliente"
                placeholder="Elegí uno o más operadores"
                searchPlaceholder="Buscar operador..."
                emptyMessage="Sin operadores"
                options={operadores.map(item => ({ value: item.id, label: item.nombre }))}
            />
        </>
    )
}
