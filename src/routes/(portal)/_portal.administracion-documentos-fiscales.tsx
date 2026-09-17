import { Suspense, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import {
    FormProvider,
    useForm,
    type SubmitErrorHandler,
    type SubmitHandler,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { ClientesHeader } from '#/presentation/components/clientes/ClientesHeader'
import {
    CREATE_DOCUMENTO_FISCAL_FORM_ID,
    CreateDocumentoFiscalForm,
    MONEDAS_CONFIG,
} from '#/presentation/components/documentos-fiscales/CreateDocumentoFiscalForm'
import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { LoadingState } from '#/presentation/components/shared/LoadingState'
import { useCreateDocumentoFiscal } from '#/presentation/hooks/documentos-fiscales/useCreateDocumentoFiscal'
import {
    createDocumentoFiscalSchema,
    type CreateDocumentoFiscalFormValues,
    type CreateDocumentoFiscalSchema,
} from '#/presentation/schema/documentos-fiscales/create-documento-fiscal-schema'
import type { FiltrosDocumentosFiscales } from '#/presentation/schema/documentos-fiscales/filtrosDocumentosFiscalesSchema'
import { DocumentosFiscalesFiltersBar } from '#/presentation/views/documentos-fiscales/DocumentosFiscalesFiltersBar'
import { DocumentosFiscalesView } from '#/presentation/views/documentos-fiscales/DocumentosFiscalesView'

export const Route = createFileRoute(
    '/(portal)/_portal/administracion-documentos-fiscales',
)({
    component: RouteComponent,
})

function RouteComponent() {
    const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false)
    const [filtros, setFiltros] = useState<FiltrosDocumentosFiscales>({})

    const form = useForm<
        CreateDocumentoFiscalFormValues,
        unknown,
        CreateDocumentoFiscalSchema
    >({
        resolver: zodResolver(createDocumentoFiscalSchema),
        reValidateMode: 'onChange',
        defaultValues: {
            moneda: MONEDAS_CONFIG[0].value,
        }
    })

    const {
        mutate: crearDocumentoFiscal,
        isPending,
        isSuccess,
        reset,
    } = useCreateDocumentoFiscal()

    const handleOpenChange = (open: boolean) => {
        setDialogoCrearAbierto(open)
        if (!open) form.reset()
    }

    useEffect(() => {
        if (!isSuccess) return
        handleOpenChange(false)
        reset()
    }, [isSuccess])

    const onSuccess: SubmitHandler<CreateDocumentoFiscalSchema> = (data) => {
        crearDocumentoFiscal(data);
    }

    const onError: SubmitErrorHandler<CreateDocumentoFiscalFormValues> = (
        errors,
    ) => {
        console.error('Errores de validación:', errors)
    }

    return (
        <div className="space-y-8">
            <ClientesHeader
                titulo="Documentos fiscales"
                descripcion="Todos los documentos emitidos, con su autorización, moneda e importes."
                actions={
                    <CustomButton
                        fullWidth={false}
                        icon={<Plus className="size-4" />}
                        onClick={() => setDialogoCrearAbierto(true)}
                    >
                        Crear Documento Fiscal
                    </CustomButton>
                }
            />

            <Suspense fallback={<LoadingState />}>
                <DocumentosFiscalesFiltersBar
                    filtros={filtros}
                    onApply={setFiltros}
                />
            </Suspense>

            <Suspense
                fallback={<LoadingState />}
            >
                <DocumentosFiscalesView filtros={filtros} />
            </Suspense>

            <CustomDialog
                open={dialogoCrearAbierto}
                onOpenChange={handleOpenChange}
                title="Nuevo documento fiscal"
                description="Completá los datos del documento y vinculá los lotes que ampara."
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
                            form={CREATE_DOCUMENTO_FISCAL_FORM_ID}
                            disabled={isPending}
                            isLoading={isPending}
                        >
                            {isPending ? 'Creando...' : 'Crear documento'}
                        </CustomButton>
                    </>
                }
            >
                <FormProvider {...form}>
                    <form
                        id={CREATE_DOCUMENTO_FISCAL_FORM_ID}
                        className="space-y-4"
                        onSubmit={form.handleSubmit(onSuccess, onError)}
                    >
                        <Suspense
                            fallback={<LoadingState />}
                        >
                            <CreateDocumentoFiscalForm />
                        </Suspense>
                    </form>
                </FormProvider>
            </CustomDialog>
        </div>
    )
}
