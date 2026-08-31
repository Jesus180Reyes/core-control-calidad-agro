import { Suspense, useState } from 'react'
import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { FormProvider, useForm, type SubmitErrorHandler, type SubmitHandler } from 'react-hook-form'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import {
    CREATE_LOTE_FORM_ID,
    CreateLoteForm,
} from '#/presentation/components/lotes/CreateLoteForm'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { LotesInspectionView } from '#/presentation/views/inspeccion-lotes/LotesInspectionView'
import { createLoteSchema, type CreateLoteSchema } from '#/presentation/schema/crear-lote/crearLoteSchema'
import { Can } from '#/presentation/components/shared/Can'

export const Route = createFileRoute(
    '/(portal)/_portal/inspeccion-lotes-by-cliente',
)({
    validateSearch: (search: Record<string, unknown>) => ({
        clienteId: Number(search.clienteId),
    }),
    beforeLoad: ({ search }) => {
        if (!Number.isInteger(search.clienteId)) {
            throw redirect({ to: '/inspeccion-clientes' })
        }
    },
    component: RouteComponent,
})

function RouteComponent() {
    const { clienteId } = Route.useSearch()
    const cliente = useLocation({ select: (location) => location.state.cliente })

    const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false);

    const form = useForm<CreateLoteSchema>({
        resolver: zodResolver(createLoteSchema),
        defaultValues: {
            cliente_id: clienteId,

        }
    });

    const handleOpenChange = (open: boolean) => {
        setDialogoCrearAbierto(open)
        if (!open) form.reset()
    }

    const onSubmit: SubmitHandler<CreateLoteSchema> = (data) => {
        // TODO: conectar con el endpoint de creación de lote.
        console.log('Nuevo lote', data)
        handleOpenChange(false)
    }
    const onError: SubmitErrorHandler<CreateLoteSchema> = (errors) => {
        console.error("Errores de validación:", errors);
    }

    return (
        <div className="space-y-8">
            <ClientesHeader
                backTo="/inspeccion-clientes"
                titulo="Lotes registrados"
                descripcion={
                    cliente
                        ? `Todos los lotes de ${cliente.nombre}, activos e inactivos.`
                        : 'Todos los lotes del cliente, activos e inactivos.'
                }
                actions={
                    <Can permission='CREAR-CLIENTE-LOTE-NUEVO'>

                        <CustomButton
                            fullWidth={false}
                            icon={<Plus className="size-4" />}
                            onClick={() => handleOpenChange(true)}
                        >
                            Crear nuevo lote
                        </CustomButton>
                    </Can>
                }
            />

            <Suspense fallback={<LoadingState label="Cargando lotes..." />}>
                <LotesInspectionView clienteId={clienteId} />
            </Suspense>

            <CustomDialog
                open={dialogoCrearAbierto}
                onOpenChange={handleOpenChange}
                title="Nuevo lote"
                description={
                    cliente
                        ? `Completá los datos del lote para ${cliente.nombre}.`
                        : 'Completá los datos del lote para darlo de alta.'
                }
                size="xl"
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
                            form={CREATE_LOTE_FORM_ID}
                        >
                            Crear lote
                        </CustomButton>
                    </>
                }
            >
                <FormProvider {...form}>
                    <form
                        id={CREATE_LOTE_FORM_ID}
                        className="space-y-4"
                        onSubmit={form.handleSubmit(onSubmit, onError)}
                    >
                        <CreateLoteForm />
                    </form>
                </FormProvider>
            </CustomDialog>
        </div>
    )
}
