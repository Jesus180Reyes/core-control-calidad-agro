import type { FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { useCreateOrigen } from '#/presentation/hooks/origenes/useCreateOrigen'
import { createOrigenSchema, type CreateOrigenSchema } from '#/presentation/schema/crear-origen/createOrigenSchema'

export const CREATE_ORIGEN_FORM_ID = 'form-crear-origen'

interface CreateOrigenDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Se llama con el id del origen creado, cuando el catálogo ya lo trae. */
    onCreated: (origenId: number) => void
}

export function CreateOrigenDialog({ open, onOpenChange, onCreated }: CreateOrigenDialogProps) {
    const { mutate: createOrigen, isPending } = useCreateOrigen()

    // Formulario propio: el contexto más cercano es el del lote, y mezclarlos
    // haría que la validación de uno bloquee al otro.
    const form = useForm<CreateOrigenSchema>({
        resolver: zodResolver(createOrigenSchema),
        defaultValues: { nombre: '' },
    })

    const handleOpenChange = (abierto: boolean) => {
        onOpenChange(abierto)
        if (!abierto) form.reset()
    }

    const onSubmit: SubmitHandler<CreateOrigenSchema> = (data) => {
        // Este `onSuccess` corre después del del hook, que espera la
        // invalidación del catálogo: al elegirlo, la opción ya existe.
        createOrigen(data, {
            onSuccess: (respuesta) => {
                onCreated(respuesta.origen_id)
                handleOpenChange(false)
            },
        })
    }

    // El diálogo se pinta en un portal, pero en React el `submit` sube por el
    // árbol de componentes: sin cortarlo, crear un origen enviaría también el
    // formulario del lote que lo contiene.
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.stopPropagation()
        void form.handleSubmit(onSubmit)(event)
    }

    return (
        <CustomDialog
            open={open}
            onOpenChange={handleOpenChange}
            title="Nuevo origen"
            description="El origen queda disponible para los lotes de todos los clientes."
            size="sm"
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        fullWidth={false}
                        onClick={() => handleOpenChange(false)}
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        fullWidth={false}
                        type="submit"
                        form={CREATE_ORIGEN_FORM_ID}
                        disabled={isPending}
                        isLoading={isPending}
                    >
                        {isPending ? 'Creando...' : 'Crear origen'}
                    </CustomButton>
                </>
            }
        >
            <form id={CREATE_ORIGEN_FORM_ID} className="space-y-4" onSubmit={handleSubmit}>
                <ControlledInput
                    control={form.control}
                    name="nombre"
                    label="Nombre"
                    placeholder="Finca El Recreo"
                />
                <ControlledInput
                    control={form.control}
                    name="direccion"
                    label="Dirección"
                    placeholder="Opcional"
                />
                <ControlledInput
                    control={form.control}
                    name="telefono"
                    label="Teléfono"
                    placeholder="Opcional"
                />
            </form>
        </CustomDialog>
    )
}
