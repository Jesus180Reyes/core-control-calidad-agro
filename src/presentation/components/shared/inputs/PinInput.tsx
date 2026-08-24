import type { Ref } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp'

interface PinInputProps {
    value: string
    onChange: (value: string) => void
    /** Cantidad de dígitos. */
    length?: number
    /** Pinta los casilleros en rojo (PIN incorrecto). */
    invalid?: boolean
    disabled?: boolean
    autoFocus?: boolean
    /** Oculta los dígitos con puntos, como un campo de contraseña. */
    masked?: boolean
    /** Se dispara cuando el usuario completa el último dígito. */
    onComplete?: (value: string) => void
    ref?: Ref<HTMLInputElement>
}

/**
 * Campo de PIN numérico.
 *
 * Envuelve la primitiva `InputOTP` (paquete `input-otp`): un solo input real
 * detrás de los casilleros, así que el foco, el borrado, el pegado y el
 * teclado numérico del móvil los resuelve la librería y no nosotros.
 */
export function PinInput({
    value,
    onChange,
    length = 4,
    invalid = false,
    disabled = false,
    autoFocus = false,
    masked = false,
    onComplete,
    ref,
}: PinInputProps) {
    return (
        <InputOTP
            ref={ref}
            maxLength={length}
            value={value}
            onChange={onChange}
            onComplete={onComplete}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            disabled={disabled}
            autoFocus={autoFocus}
            containerClassName="justify-center"
        >
            <InputOTPGroup className="gap-3">
                {Array.from({ length }, (_, index) => (
                    <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={invalid}
                        className={`size-12 rounded-xl border text-xl font-black transition-colors first:rounded-l-xl last:rounded-r-xl ${invalid
                            ? 'border-red-500 text-red-600 dark:text-red-400'
                            : 'border-border-ui text-text-main data-[active=true]:border-brand'
                            } ${
                            // `text-security` enmascara el dígito sin perder el input real.
                            masked ? '[-webkit-text-security:disc] [text-security:disc]' : ''
                            }`}
                    />
                ))}
            </InputOTPGroup>
        </InputOTP>
    )
}
