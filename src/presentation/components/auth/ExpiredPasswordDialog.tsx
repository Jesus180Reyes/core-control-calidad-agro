import { CustomButton } from '#/presentation/components/shared/button/CustomButton'
import { CustomDialog } from '#/presentation/components/shared/dialog/CustomDialog'
import { ControlledInput } from '#/presentation/components/shared/inputs/ControlledInput'
import { useRenewPassword, type RenewPasswordRule } from '#/presentation/hooks/auth/useRenewPassword'

const ID_FORMULARIO = 'form-renovar-password'

interface ExpiredPasswordDialogProps {
    /** El usuario del intento que dio el 403, tal como lo mandó el login. */
    username: string
    /** La contraseña del intento que dio el 403: el backend ya la validó. */
    currentPassword: string
    /** El `message` del 403. */
    reason?: string
    onRenewed: (newPassword: string) => void
    onClose: () => void
}

/**
 * Renovación de la contraseña vencida (SPEC 14), abierta sobre el login.
 *
 * Solo pide la nueva y su confirmación: usuario y contraseña actual son los
 * que se acaban de escribir. Se monta únicamente con credenciales vencidas en
 * memoria, por eso el `open` es fijo y cerrar es desmontarlo con `onClose`.
 */
export function ExpiredPasswordDialog({
    username,
    currentPassword,
    reason = 'La contraseña ha caducado',
    onRenewed,
    onClose,
}: ExpiredPasswordDialogProps) {
    const { control, onSubmit, enviando, errorRenovacion, rules, verPassword, alternarVerPassword } =
        useRenewPassword({ username, currentPassword, onRenewed })

    const cumpleTodas = rules.every((rule) => rule.met)
    const tipoInput = verPassword ? 'text' : 'password'

    const botonVisibilidad = (
        <button
            type="button"
            onClick={alternarVerPassword}
            className="flex items-center justify-center size-7 rounded-lg text-text-muted/70 hover:text-brand hover:bg-brand/10 transition-colors duration-200 cursor-pointer"
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
            <IconoVisibilidadPassword visible={verPassword} />
        </button>
    )

    return (
        <CustomDialog
            open
            // Con la renovación en curso se ignora: cerrar a mitad dejaría la
            // contraseña cambiada sin que el usuario se entere.
            onOpenChange={(abierto) => {
                if (!abierto && !enviando) onClose()
            }}
            title="Tu contraseña venció"
            description={`${reason}. Elegí una contraseña nueva para ingresar.`}
            size="sm"
            footer={
                <>
                    <CustomButton
                        variant="secondary"
                        fullWidth={false}
                        type="button"
                        disabled={enviando}
                        onClick={onClose}
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        variant="primary"
                        fullWidth={false}
                        form={ID_FORMULARIO}
                        type="submit"
                        disabled={!cumpleTodas}
                        isLoading={enviando}
                    >
                        {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
                    </CustomButton>
                </>
            }
        >
            <form
                id={ID_FORMULARIO}
                onSubmit={(evento) => {
                    evento.preventDefault()
                    onSubmit()
                }}
                className="space-y-4"
            >
                <ControlledInput
                    autoComplete="new-password"
                    name="password_nueva"
                    control={control}
                    label="Contraseña nueva"
                    placeholder="Ingresá la contraseña nueva"
                    type={tipoInput}
                    accionDerecha={botonVisibilidad}
                />

                <ControlledInput
                    autoComplete="new-password"
                    name="confirmacion"
                    control={control}
                    label="Confirmación"
                    placeholder="Repetí la contraseña nueva"
                    type={tipoInput}
                />

                <RulesChecklist rules={rules} />

                {errorRenovacion && (
                    <div
                        role="alert"
                        className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60 rounded-xl px-3.5 py-3 text-sm font-semibold"
                    >
                        <IconoAlerta />
                        <span className="leading-snug whitespace-pre-line">{errorRenovacion}</span>
                    </div>
                )}
            </form>
        </CustomDialog>
    )
}

function RulesChecklist({ rules }: { rules: RenewPasswordRule[] }) {
    return (
        <ul className="space-y-1.5 rounded-xl border border-border-ui bg-bg-app px-3.5 py-3" aria-label="Requisitos de la contraseña">
            {rules.map((rule) => (
                <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs font-semibold transition-colors duration-200 ${rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'
                        }`}
                >
                    <IconoRegla met={rule.met} />
                    {rule.label}
                    <span className="sr-only">{rule.met ? '(cumplido)' : '(pendiente)'}</span>
                </li>
            ))}
        </ul>
    )
}

function IconoRegla({ met }: { met: boolean }) {
    if (met) {
        return (
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        )
    }

    return (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
        </svg>
    )
}

function IconoAlerta() {
    return (
        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v4.5M12 16h.01" />
        </svg>
    )
}

function IconoVisibilidadPassword({ visible }: { visible: boolean }) {
    if (visible) {
        return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
            </svg>
        )
    }

    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}
