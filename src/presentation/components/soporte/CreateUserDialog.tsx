import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type SubmitHandler } from 'react-hook-form'

import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { ControlledSelector } from '#/presentation/components/shared/inputs/ControlledSelector'
import { GeneratedSecret } from '#/presentation/components/soporte/GeneratedSecret'
import { useGetCatalogosRoles } from '#/presentation/hooks/catalogos/useGetCatalogosRoles'
import { useCreateUser } from '#/presentation/hooks/soporte/useCreateUser'
import {
    createUserSchema,
    type CreateUserSchema,
} from '#/presentation/schema/crear-usuario/crearUsuarioSchema'

const CREATE_USER_FORM_ID = 'form-crear-usuario'


interface CreateUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
    const form = useForm<CreateUserSchema>({
        resolver: zodResolver(createUserSchema),
        defaultValues: { username: '', complete_name: '', cedula: '' },
    })
    const { mutate: createUser, data, variables, isPending, reset } = useCreateUser()
    const { roles } = useGetCatalogosRoles()
    const roleOptions = roles.map((role) => ({ value: role.id, label: role.nombre }))

    const handleOpenChange = (next: boolean) => {
        if (isPending) return
        if (!next) {
            reset()
            form.reset()
        }
        onOpenChange(next)
    }

    const onSubmit: SubmitHandler<CreateUserSchema> = (body) => createUser(body)

    return (
        <CustomDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={data ? 'Usuario creado' : 'Nuevo usuario'}
            description={
                data
                    ? `Entréguele esta contraseña temporal a ${variables?.complete_name ?? 'el usuario'} junto con su usuario "${variables?.username ?? ''}".`
                    : 'Complete los datos del usuario. El sistema genera una contraseña temporal.'
            }
            showCloseButton={!isPending}
            size="md"
            footer={
                data ? (
                    <CustomButton fullWidth={false} onClick={() => handleOpenChange(false)}>
                        Listo
                    </CustomButton>
                ) : (
                    <>
                        <CustomButton
                            variant="secondary"
                            fullWidth={false}
                            onClick={() => handleOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </CustomButton>
                        <CustomButton
                            type="submit"
                            form={CREATE_USER_FORM_ID}
                            fullWidth={false}
                            disabled={isPending}
                            isLoading={isPending}
                        >
                            {isPending ? 'Creando...' : 'Crear usuario'}
                        </CustomButton>
                    </>
                )
            }
        >
            {data ? (
                <GeneratedSecret
                    label="Contraseña temporal"
                    value={data.password_temporal}
                    hint="Al ingresar con ella, el sistema le va a pedir que la cambie por una propia."
                />
            ) : (
                <form
                    id={CREATE_USER_FORM_ID}
                    className="space-y-4"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <ControlledInput
                        control={form.control}
                        name="complete_name"
                        label="Nombre completo"
                        placeholder="JESUS REYES"
                        uppercase
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ControlledInput
                            control={form.control}
                            name="username"
                            label="Usuario"
                            placeholder="JREYES"
                            autoComplete="off"
                            uppercase
                        />
                        <ControlledInput
                            control={form.control}
                            name="cedula"
                            label="Cédula"
                            placeholder="0801199912345"
                            autoComplete="off"
                        />
                    </div>
                    <ControlledSelector
                        control={form.control}
                        name="rol"
                        label="Rol"
                        placeholder="Elija el rol"
                        options={roleOptions}
                        valueAsNumber
                    />
                </form>
            )}
        </CustomDialog>
    )
}
