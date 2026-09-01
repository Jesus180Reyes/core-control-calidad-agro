import { useQueryClient } from "@tanstack/react-query";
import { useExecuteMutation } from "../shared/useExecuteMutation";
import { toast } from "sonner";
import type { CreateLoteSchema } from "#/presentation/schema/crear-lote/crearLoteSchema";

export const useCrearLote = () => {
    const queryClient = useQueryClient();
    const mutation = useExecuteMutation<{ ok: boolean, msg: string }, CreateLoteSchema>('/lotes', {
        onSuccess: (_data, body) => {
            toast.success(`${_data.msg}: "${body.nombre_lote}"`)
            queryClient.invalidateQueries({ queryKey: ['lotes', 'cliente'] })
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    return mutation;
}
