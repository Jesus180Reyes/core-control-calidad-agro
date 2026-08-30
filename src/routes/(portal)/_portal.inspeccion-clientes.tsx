import { Suspense, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import {
    CREATE_CLIENTE_FORM_ID,
    CreateClienteForm,
} from '#/presentation/components/clientes/CreateClienteForm'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { ClientInspectionView } from '#/presentation/views/inspeccion-clientes/ClientInspectionView'
import { FormProvider, useForm, type SubmitErrorHandler, type SubmitHandler } from 'react-hook-form'
import { createClienteSchema, type CreateClienteSchema } from '#/presentation/schema/crear-cliente/crearClienteSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCrearCliente } from '#/presentation/hooks/clientes/useCrearCliente'

export const Route = createFileRoute('/(portal)/_portal/inspeccion-clientes')({
    component: RouteComponent,
})

function RouteComponent() {
    const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false)
    const form = useForm<CreateClienteSchema>({
        resolver: zodResolver(createClienteSchema),
    });

    const { mutateAsync: crearCliente, isPending } = useCrearCliente();

    const handleOpenChange = (open: boolean) => {
        setDialogoCrearAbierto(open)
        if (!open) form.reset();
    }

    const onSuccess: SubmitHandler<CreateClienteSchema> = (data) => {
        handleOpenChange(false);
        crearCliente(data);
    }

    const onError: SubmitErrorHandler<CreateClienteSchema> = (errors) => {
        console.error("Errores de validación:", errors);
    }

    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Inspección de clientes"
                descripcion="Revisá los datos de cada cliente antes de habilitarlo para pesar."
                actions={
                    <CustomButton
                        fullWidth={false}
                        icon={<Plus className="size-4" />}
                        onClick={() => setDialogoCrearAbierto(true)}
                    >
                        Crear Nuevo cliente
                    </CustomButton>
                }
            />

            <Suspense fallback={<LoadingState label="Cargando clientes..." />}>
                <ClientInspectionView />
            </Suspense>

            <CustomDialog
                open={dialogoCrearAbierto}
                onOpenChange={handleOpenChange}
                title="Nuevo cliente"
                description="Completá los datos del cliente para darlo de alta."
                size="lg"
                footer={
                    <>
                        <CustomButton
                            variant="secondary"
                            fullWidth={false}
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancelar
                        </CustomButton>
                        <CustomButton fullWidth={false} type="submit" form={CREATE_CLIENTE_FORM_ID} disabled={isPending} >
                            {isPending ? 'Creando...' : 'Crear cliente'}
                        </CustomButton>
                    </>
                }
            >
                <FormProvider {...form}>
                    <form
                        id={CREATE_CLIENTE_FORM_ID}
                        className="space-y-4"
                        onSubmit={form.handleSubmit(onSuccess, onError)}
                    >

                        <CreateClienteForm />
                    </form>
                </FormProvider>
            </CustomDialog>
        </div>
    )
}

