import { useFormContext } from 'react-hook-form'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledMultiSelector } from '#/presentation/components/shared/inputs/ControlledMultiSelector'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import {
    type CreateClienteSchema,
} from '#/presentation/schema/crear-cliente/crearClienteSchema'

/** Id del `<form>`: lo usa el botón de guardar, que vive fuera del formulario (en el footer del diálogo). */
export const CREATE_CLIENTE_FORM_ID = 'form-crear-cliente'

// TODO: reemplazar por los catálogos del backend.
const PRODUCTOS = [
    { value: '1', label: 'Producto 1' },
    { value: '2', label: 'Producto 2' },
]

const USUARIOS = [
    { value: 1, label: 'Usuario 1' },
    { value: 17, label: 'Usuario 2' },
]




export function CreateClienteForm() {
    const { control } = useFormContext<CreateClienteSchema>()

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
                    label="RTN"
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
                options={PRODUCTOS}
                valueAsNumber
                showSearch
            />
            <ControlledMultiSelector
                control={control}
                name="usuario_ids"
                label="Usuarios vinculados a este cliente"
                placeholder="Elegí uno o más usuarios"
                searchPlaceholder="Buscar usuario..."
                emptyMessage="Sin usuarios"
                options={USUARIOS}
            />
        </>
    )
}
