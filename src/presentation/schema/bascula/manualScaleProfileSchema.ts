import z from "zod";
import { DETECTION_BAUD_RATES, DETECTION_BYTE_FORMATS, FRAME_FORMATS, POLL_COMMANDS } from "#/presentation/hooks/bascula/scaleDetection";
import type { PollCommandId } from "#/presentation/types/control-calidad/perfil-bascula.types";

const POLL_COMMAND_IDS = Object.keys(POLL_COMMANDS) as [PollCommandId, ...PollCommandId[]];

export const manualScaleProfileSchema = z
    .object({
        baudRate: z
            .number({ error: 'Velocidad requerida' })
            .refine((valor) => (DETECTION_BAUD_RATES as readonly number[]).includes(valor), 'Velocidad no válida'),
        byteFormat: z.enum(DETECTION_BYTE_FORMATS, { error: 'Formato del byte requerido' }),
        mode: z.enum(['continuo', 'consulta'], { error: 'Modo requerido' }),
        pollCommand: z.enum(POLL_COMMAND_IDS).nullable(),
        frameFormat: z.enum(FRAME_FORMATS, { error: 'Formato de trama requerido' }),
    })
    .refine((perfil) => perfil.mode !== 'consulta' || perfil.pollCommand !== null, {
        message: 'Elija el comando para pedir el peso',
        path: ['pollCommand'],
    })
    .transform((perfil) => ({
        ...perfil,
        pollCommand: perfil.mode === 'consulta' ? perfil.pollCommand : null,
    }));

export type ManualScaleProfileFormValues = z.input<typeof manualScaleProfileSchema>;
