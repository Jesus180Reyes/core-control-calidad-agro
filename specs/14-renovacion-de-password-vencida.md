# SPEC 14 — Renovación de contraseña vencida desde el login

> **Estado:** Approved
> **Depende de:** SPEC 33 del backend (`core-control-calidad-agro-backend/specs/33-renovacion-de-password-vencida.md`), implementado en la rama `spec-33-renovacion-de-password-vencida` del backend y **todavía sin mergear**; SPEC 02 (login y sesión) y SPEC 07 (permisos pedidos en el login) de este repo
> **Fecha:** 2026-10-07
> **Objetivo:** Cuando `POST /auth/login` responda 403 con `passwordVencida: true`, abrir sobre el login un `ExpiredPasswordDialog` que pida la contraseña nueva, la renueve con `POST /auth/renovar-password` e inicie sesión solo con ella.

---

## Por qué existe este spec

El backend ahora vence las contraseñas (SPEC 33 del backend). Hoy el front recibiría ese 403 en `useLogin.onError` y lo pintaría en el banner rojo del formulario como un error más. El usuario leería "La contraseña ha caducado" y no tendría dónde cambiarla. Este spec le da el camino.

Hay tres cosas que conviene saber antes de leer el resto.

**La primera: el 403 solo llega con la contraseña correcta.** El backend chequea el vencimiento **después** de validar la contraseña. Por eso, cuando llega el 403, el `username` y el `password` que el usuario acaba de escribir son credenciales válidas. El diálogo los reutiliza como `username` y `password_actual` y solo pide la contraseña nueva dos veces.

**La segunda: el 403 no lo intercepta nadie.** La política del 401 de `http-client.ts` vuelve a lanzar cualquier otro status tal cual. `interceptores-auth.ts` no registra `onError`. `useLogin` trae su propio `onError`, así que no sale el toast automático. El `HttpError` llega a `useLogin.onError` con `status: 403` y el `body` intacto.

**La tercera: lo nuevo de este flujo son los usuarios recién creados.** Los usuarios anteriores al SPEC 33 tienen `password_vence_en = NULL` y no vencen. Todo usuario creado con `POST /auth/register` después de ese spec **nace vencido**. Sin este spec, ningún usuario nuevo puede entrar.

---

## Alcance

**Dentro:**

- Detectar el 403 de contraseña vencida en `useLogin.onError` y abrir el diálogo en lugar de pintar el banner.
- Un `ExpiredPasswordDialog` sobre `CustomDialog`, con dos campos: contraseña nueva y confirmación.
- Un checklist en vivo de las reglas. El botón queda deshabilitado hasta que se cumplan todas.
- `POST /auth/renovar-password` con `{ username, password_actual, password_nueva }`. Los dos primeros se toman de lo escrito en el login.
- Al renovar con éxito, login automático con la contraseña nueva por el camino normal de `useLogin`: sesión, `GET /permisos/me` y navegación a `/`.
- El diálogo se puede cerrar con Cancelar, la X o Esc, y se vuelve al login sin sesión.
- Tipos: `passwordVencida` en `LoginResponse`, más el request y la response de la renovación.
- Tests de la detección del 403 y de las reglas del schema.
- `CLAUDE.md` actualizado.

**Fuera de alcance (para specs futuros):**

- **Cambio de contraseña voluntario desde el portal**, como un "Cambiar contraseña" en el menú de usuario. El backend ya lo permite, porque el endpoint acepta contraseñas vigentes, pero es otra pantalla y otro spec.
- Aviso previo de vencimiento ("tu contraseña vence en 5 días"). El backend no lo manda.
- Recuperación de contraseña olvidada.
- Que un admin restablezca la contraseña de otro usuario.
- Medidor de fortaleza de la contraseña más allá de las reglas del backend.
- Mostrar qué usuarios están vencidos en alguna pantalla de administración.

---

## Modelo de datos

### Contrato del backend (SPEC 33)

`POST /auth/login`, contraseña correcta y vencida → **403**:

```json
{ "statusCode": 403, "message": "La contraseña ha caducado", "passwordVencida": true }
```

No trae `accessToken` ni `user`. Este 403 no lleva la clave `error`.

`POST /auth/login`, contraseña correcta y vigente → **200**, igual que hoy más `passwordVencida: false` en el primer nivel.

`POST /auth/login`, credenciales incorrectas → **401** sin `passwordVencida`, esté o no vencida la contraseña.

`POST /auth/renovar-password` es público y no lleva `Bearer`:

| Caso | Código | Cuerpo |
| --- | --- | --- |
| Éxito | 200 | `{ ok: true, msg: 'Contraseña actualizada correctamente' }`, **sin token** |
| Usuario inexistente o `password_actual` incorrecta | 401 | `message: 'Usuario o contraseña incorrectos'` |
| `password_nueva` igual a la actual | 400 | `message: 'La nueva contraseña debe ser distinta de la actual'` |
| `password_nueva` no cumple las reglas | 400 | Errores de Zod; `mensajeDelServidor` los aplana |

Reglas de `password_nueva` en el backend: mínimo 8 caracteres, al menos una mayúscula (`/[A-Z]/`), al menos un número (`/[0-9]/`) y distinta de la actual.

### Tipos — `src/presentation/types/auth/auth.types.ts`

```ts
export interface LoginResponse {
    // ...campos actuales
    /** SPEC 33 del backend. Siempre false en el 200; el caso true llega como 403. */
    passwordVencida?: boolean
}

export interface RenovarPasswordRequest {
    username: string
    password_actual: string
    password_nueva: string
}

export interface RenovarPasswordResponse {
    ok: boolean
    msg: string
}
```

`passwordVencida` es **opcional** para que el front siga compilando y funcionando contra un backend que todavía no lo emite. Nada del 200 lo lee: el caso que importa llega como error.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/types/auth/auth.types.ts` | `passwordVencida?` en `LoginResponse`, más `RenovarPasswordRequest` y `RenovarPasswordResponse`. |
| `src/presentation/hooks/auth/passwordVencida.ts` | Nuevo. `isExpiredPasswordError(error): boolean`. |
| `src/presentation/hooks/auth/passwordVencida.test.ts` | Nuevo. Tests del guard. |
| `src/presentation/hooks/auth/renewPasswordSchema.ts` | Nuevo. `createRenewPasswordSchema(currentPassword)`, más el tipo del formulario. |
| `src/presentation/hooks/auth/renewPasswordSchema.test.ts` | Nuevo. Tests de las reglas. |
| `src/presentation/hooks/auth/useRenewPassword.tsx` | Nuevo. Formulario y mutación de la renovación. |
| `src/presentation/components/auth/ExpiredPasswordDialog.tsx` | Nuevo. El diálogo, con el checklist. |
| `src/presentation/hooks/auth/useLogin.tsx` | Rama del 403 en `onError`, estado de las credenciales vencidas y login después de renovar. |
| `src/presentation/views/auth/LoginCard.tsx` | Monta el `ExpiredPasswordDialog`. |
| `CLAUDE.md` | Sección del flujo. |

Los identificadores nuevos van en inglés, como pide `CLAUDE.md`. Los campos del contrato (`password_actual`, `password_nueva`, `passwordVencida`) quedan como los manda el backend.

### Detección — `isExpiredPasswordError`

Devuelve `true` solo si se cumplen las dos condiciones:

- `esProhibido(error)`, el helper que ya existe en `http-errors.ts`.
- `error.body` es un objeto con `passwordVencida === true`.

Un 403 por cualquier otro motivo sigue el camino de hoy y se pinta en el banner. El helper vive en `presentation/hooks/auth/` y **no** en `infrastructure/http/core/`, porque `core/` no sabe nada del dominio (`CLAUDE.md`, Cliente HTTP).

### Credenciales en memoria

`useLogin` guarda `{ username, password }` del intento que dio el 403 en un `useState` (`expiredCredentials`). Esas credenciales:

- Viven **solo en memoria**, nunca en `localStorage` ni en la sesión.
- Se borran al cerrar el diálogo y después de renovar con éxito.
- Abren el diálogo: `open` es `expiredCredentials !== null`.

### Schema — `createRenewPasswordSchema(currentPassword)`

Es una factory y no una constante, porque "distinta de la actual" se puede validar en el front: la contraseña actual es la que el usuario acaba de escribir en el login.

| Campo | Regla | Mensaje |
| --- | --- | --- |
| `password_nueva` | `min(8)` | `Al menos 8 caracteres` |
| | `/[A-Z]/` | `Al menos una mayúscula` |
| | `/[0-9]/` | `Al menos un número` |
| | `!== currentPassword` | `Distinta de la contraseña actual` |
| `confirmacion` | igual a `password_nueva` | `Las contraseñas coinciden` |

Los mensajes son los textos del checklist. El checklist pinta las cinco reglas, cada una marcada si se cumple y neutra si no, y se recalcula al escribir (`mode: 'onChange'`). El backend vuelve a validar las cuatro primeras. El front las repite por comodidad, no como control.

### El diálogo — `ExpiredPasswordDialog`

Se apoya en `CustomDialog` con `size="sm"`. Lleva:

- Título `Tu contraseña venció`.
- Como descripción, el `message` del 403 ("La contraseña ha caducado") más una línea que explica que tiene que elegir una nueva para ingresar.
- Dos `ControlledInput` de tipo password, con el ojo de `accionDerecha` como en el login.
- El checklist.
- El error del servidor en un banner como el del `LoginCard` (`role="alert"`).
- En el pie, **Cancelar** y **Cambiar contraseña**. Este último queda deshabilitado mientras el formulario es inválido o hay un envío en curso, y muestra "Cambiando…" durante la renovación y "Ingresando…" durante el login automático.

`showCloseButton` queda en `true`. Mientras hay un envío en curso, `onOpenChange(false)` se ignora, así no se cierra a mitad de la renovación.

### Errores dentro del diálogo

`useRenewPassword` trae su propio `onError`, igual que `useLogin`, así que no sale el toast automático. Pinta `mensajeDeError(error)` en el banner del diálogo:

- **400:** la regla que falló o "distinta de la actual". En la práctica no debería llegar, porque el checklist la evita antes.
- **401:** las credenciales dejaron de ser válidas entre el login y la renovación, por ejemplo porque otra persona cambió la contraseña. El mensaje del backend se pinta tal cual y el usuario puede cancelar y volver a ingresar.
- **Red o timeout:** el texto que ya trae el error. El usuario puede reintentar.

---

## Plan de implementación

1. Agregar los tipos a `auth.types.ts`. `npx tsc --noEmit` pasa y nada cambia en pantalla.
2. Crear `passwordVencida.ts` con `isExpiredPasswordError` y su test. Casos del test:
   - 403 con `passwordVencida: true` da `true`.
   - 403 sin la clave, o con `passwordVencida: false`, da `false`.
   - 401 da `false`.
   - `NetworkError` da `false`.
   - Un `Error` cualquiera da `false`.
3. Crear `renewPasswordSchema.ts` con `createRenewPasswordSchema` y su test: cada regla por separado, la contraseña igual a la actual y una confirmación que no coincide.
4. Crear `useRenewPassword.tsx`:
   - Recibe `{ username, currentPassword, onRenewed(newPassword) }`.
   - Arma el `useForm` con el schema de la factory.
   - Llama a `useExecuteMutation<RenovarPasswordResponse, RenovarPasswordRequest>('/auth/renovar-password')` con `onError` propio.
   - En `onSuccess` llama a `onRenewed(password_nueva)`.
   - Devuelve `control`, `onSubmit`, `enviando`, `errorRenovacion`, el estado de cada regla para el checklist y el toggle de visibilidad.
5. Crear `ExpiredPasswordDialog.tsx`, que solo pinta lo que le da `useRenewPassword`. Todavía no se monta en ningún lado.
6. En `useLogin.tsx`:
   - El `onError` pregunta primero `isExpiredPasswordError(error)`. Si es `true`, guarda las credenciales del intento en `expiredCredentials` y **no** llama a `setErrorLogin`. Si no, sigue igual que hoy.
   - Expone `expiredCredentials`, `closeExpiredDialog()` (las borra) y `loginAfterRenewal(newPassword)`.
   - `loginAfterRenewal` borra `expiredCredentials` y llama a `mutation.mutate({ username, password: newPassword })`, que es la misma mutación del login y el mismo `onSuccess` (sesión, permisos y navegación).
   - Las credenciales del intento salen de las `variables` del `onError` (`onError(error, variables)`), no de releer el formulario.
7. En `LoginCard.tsx`, montar `<ExpiredPasswordDialog>` cuando `expiredCredentials` no es `null`, con `onRenewed={loginAfterRenewal}` y `onClose={closeExpiredDialog}`. Prueba manual contra el backend del SPEC 33: un usuario con `password_vence_en = NOW()` abre el diálogo, renueva y entra a `/`.
8. Cubrir el fallo del login automático. Si `loginAfterRenewal` falla, el diálogo ya está cerrado y el error se pinta en el banner del `LoginCard` con el mensaje que trae, como cualquier login fallido. La contraseña ya cambió, así que el usuario reintenta con la nueva.
9. Actualizar `CLAUDE.md`: una sección breve del flujo, que explique que el 403 de login se distingue por `body.passwordVencida`, que las credenciales viven solo en memoria, y que `useLogin` y `useRenewPassword` traen `onError` propio.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run test` pasan.
- [ ] Un usuario con la contraseña vigente ingresa igual que antes de este spec, sin ver el diálogo.
- [ ] Credenciales incorrectas siguen mostrando el banner rojo del login, y el diálogo no se abre.
- [ ] Un usuario con la contraseña vencida y la contraseña correcta ve el `ExpiredPasswordDialog` encima del login, y el banner rojo **no** aparece.
- [ ] Un 403 sin `passwordVencida: true` en el cuerpo se pinta en el banner y no abre el diálogo.
- [ ] El diálogo pide solo la contraseña nueva y su confirmación. No pide usuario ni contraseña actual.
- [ ] El checklist marca cada regla en cuanto se cumple: 8+ caracteres, mayúscula, número, distinta de la actual y confirmación igual.
- [ ] "Cambiar contraseña" queda deshabilitado mientras alguna regla falla.
- [ ] Escribir como nueva la misma contraseña del login deja la regla "Distinta de la contraseña actual" sin cumplir y el botón deshabilitado.
- [ ] La petición a `POST /auth/renovar-password` sale sin header `Authorization` y con `{ username, password_actual, password_nueva }`.
- [ ] Al renovar con éxito, el usuario termina en `/` con sesión iniciada y permisos cargados, sin volver a escribir nada.
- [ ] Después de renovar, el login con la contraseña vieja da 401 y con la nueva da 200.
- [ ] Un 401 o 400 de la renovación se pinta dentro del diálogo, sin toast, y el diálogo sigue abierto.
- [ ] Cancelar, la X y Esc cierran el diálogo y vuelven al login sin sesión.
- [ ] Mientras la renovación está en curso, el diálogo no se puede cerrar.
- [ ] Después de cerrar el diálogo, volver a ingresar con la contraseña vencida lo abre de nuevo.
- [ ] Las credenciales del intento vencido no aparecen en `localStorage`.
- [ ] Contra un backend sin el SPEC 33, el login funciona igual que hoy.

---

## Decisiones

- **Sí:** un diálogo sobre el login y no una ruta `/renovar-password`. Decisión del usuario. El usuario no pierde el contexto, y las credenciales viven en el estado del login sin pasar por la URL.
- **No:** una ruta propia. Habría que pasarle las credenciales por algún lado (URL, `sessionStorage`), y las dos opciones son peores que la memoria.
- **Sí:** reutilizar `CustomDialog`. Ya es la base de nueve diálogos del proyecto.
- **Sí:** el diálogo pide solo la nueva y la confirmación. Decisión del usuario. El 403 garantiza que las credenciales que se acaban de escribir son válidas.
- **No:** volver a pedir la contraseña actual. Repetiría algo que se validó un segundo antes.
- **Sí:** login automático después de renovar, reutilizando la mutación de `useLogin`. Decisión del usuario. Hay un solo camino de entrada: el mismo `onSuccess`, los mismos permisos y la misma navegación.
- **No:** cerrar y que el usuario ingrese a mano. Agrega un paso sin ganar nada.
- **Sí:** el diálogo se puede cerrar. Decisión del usuario. Sin token no hay acceso, así que bloquearlo no protege nada y solo atrapa al usuario.
- **No:** un diálogo bloqueante como el `PrintTicketDialog`. Allá el bloqueo protege un bulto sin etiqueta; acá no protege nada.
- **Sí:** checklist en vivo. Decisión del usuario. Las reglas son cuatro y conocidas, y mostrarlas antes evita un 400 por cada intento.
- **Sí:** "distinta de la actual" se valida también en el front. Es posible porque la contraseña actual es la del login, que está en memoria.
- **Sí:** detectar por `status === 403` **y** `body.passwordVencida === true`. Un 403 por otro motivo no tiene que abrir este diálogo.
- **Sí:** el guard vive en `presentation/hooks/auth/` y no en `http-errors.ts`. `core/` no conoce el dominio.
- **Sí:** las credenciales viven solo en un `useState`. Una contraseña en claro no se persiste en ningún lado.
- **Sí:** las credenciales salen de las `variables` del `onError`, no del formulario. Son exactamente las que dieron el 403, aunque el usuario haya tocado el campo después.
- **Sí:** `passwordVencida` es opcional en `LoginResponse`. El front no depende de que el backend ya esté desplegado.
- **No:** cambio de contraseña voluntario desde el portal en este spec. Es otra pantalla y queda anotado para otro spec.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El front se despliega antes que el backend del SPEC 33 | No se rompe nada. El 403 no llega nunca, el diálogo no se abre y `passwordVencida` es opcional. |
| El backend se despliega antes que este spec | **Ningún usuario nuevo puede entrar**: nace vencido, y el 403 se pinta en el banner sin salida. Hay que desplegar este spec **antes o junto** con el backend. |
| La renovación sale bien y el login automático falla (red, timeout) | La contraseña ya cambió. El paso 8 pinta el error en el banner del login y el usuario reintenta con la nueva. |
| La contraseña en claro queda en memoria mientras el diálogo está abierto | Es la misma que ya está en el formulario del login. Se borra al cerrar o al renovar, y nunca se persiste. |
| El checklist del front y las reglas del backend se desalinean | El backend vuelve a validar y su 400 se pinta en el diálogo. Si cambian las reglas en `RenovarPasswordDto`, hay que tocar `createRenewPasswordSchema`. |
| El campo `username` del login usa `uppercase` y el usuario se guardó en minúsculas | El diálogo manda el mismo valor que mandó el login, que el backend acaba de aceptar. No se transforma de nuevo. |

---

## Lo que **no** entra en este spec

- Cambio de contraseña voluntario desde el portal.
- Aviso previo de vencimiento.
- Recuperación de contraseña olvidada.
- Restablecimiento por un admin.
- Medidor de fortaleza de la contraseña.
- Pantalla de usuarios vencidos.

Cada uno de estos, si se necesita, va en su propio spec.
