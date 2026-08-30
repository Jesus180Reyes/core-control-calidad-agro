import type { UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { esCancelado, mensajeDeError } from '#/infrastructure/http/http-client'

/**
 * El toast de error de toda mutación, resuelto una sola vez.
 *
 * Una mutación que falla **siempre** avisa: en planta, un guardado que no pasó
 * y no dijo nada se descubre recién al cerrar el turno. Por eso el toast es el
 * comportamiento por defecto de los `useExecute*Mutation` y no algo que cada
 * hook tenga que acordarse de escribir en su `onError`.
 *
 * La regla es la ausencia del callback, sin ninguna opción que configurar: un
 * hook que **no** declara `onError` recibe el toast; uno que sí lo declara está
 * diciendo que del error se encarga él (el login lo pinta dentro del
 * formulario, no flotando).
 */

type OnError<TData, TVariables> = NonNullable<
  UseMutationOptions<TData, Error, TVariables>['onError']
>

export function withErrorToast<TData, TVariables>(
  onError: UseMutationOptions<TData, Error, TVariables>['onError'],
): OnError<TData, TVariables> {
  if (onError) return onError

  return (error) => {
    // Una cancelación no es un fallo que el operario tenga que ver: pasa al
    // desmontar la pantalla o al cambiar de ruta.
    if (esCancelado(error)) return

    toast.error(mensajeDeError(error))
  }
}
