# SPEC 16 — PIN de supervisor validado contra el backend

> **Estado:** Approved
> **Depende de:** SPEC 38 del backend (`core-control-calidad-agro-backend/specs/38-autorizacion-por-pin-de-supervisor.md`), implementado en la rama `spec-38-autorizacion-por-pin-de-supervisor` del backend y **todavía sin mergear**; SPEC 05 (guardar pesaje) y SPEC 11 (ticket obligatorio) de este repo
> **Fecha:** 2026-10-10
> **Objetivo:** Que el `BloqueoCriticoDialog` valide el PIN con `POST /pesajes/validar-pin` en vez de compararlo con `VITE_SUPERVISOR_PIN`, y que el pesaje se guarde con el `autorizacion_token` que devuelve, mostrando en la tara qué supervisor autorizó.

---

## Por qué existe este spec

Hoy el bloqueo crítico es una simulación. `useControlCalidad` compara el PIN tipeado contra `import.meta.env.VITE_SUPERVISOR_PIN`, que Vite mete dentro del bundle. Eso tiene tres consecuencias:

- **El PIN es público:** cualquiera lo lee desde las DevTools.
- **Es uno solo para todos:** no identifica a ningún supervisor.
- **No queda ningún rastro:** el backend no se entera de que hubo una autorización. El texto del diálogo, "Esta acción será registrada en el historial de auditoría permanente", hoy es falso.

El SPEC 38 del backend resuelve las tres cosas:

- Cada supervisor tiene un PIN propio, que lo genera el sistema.
- `POST /pesajes/validar-pin` identifica al supervisor y devuelve un token de un solo uso.
- `POST /pesajes` acepta ese token y registra al supervisor en `aprobado_con_excepcion_por`.

**El control sigue siendo del front, por decisión del backend.** `POST /pesajes` no exige el token: un pesaje sobre el máximo sin token se guarda igual. Si el front no manda el token, el pesaje queda guardado sin supervisor y nadie se entera. Este spec es lo que hace que el registro de quién autorizó funcione de verdad.

---

## Alcance

**Entra:**

- `useValidateSupervisorPin` (`presentation/hooks/pesajes/`): mutación contra `POST /pesajes/validar-pin` con `{ pin }`. Trae `onError` propio, así que no lanza toast.
- `useControlCalidad.handleAutorizarConPin` pasa a ser async:
  - llama al hook y guarda `{ token, supervisor }` en un estado `autorizacion`;
  - devuelve `true` con un 200 y `false` con un 400 (reconocido con `esSolicitudInvalida`, helper nuevo en `core/http-errors.ts`);
  - con cualquier otro error, relanza.
- Se borra la constante `PIN_SUPERVISOR` y se quita `VITE_SUPERVISOR_PIN` de `.env.example`.
- `usePesajes.guardarPesaje(pesoBruto, tara, autorizacionToken?)` manda `autorizacion_token` solo cuando hay token.
- Si `POST /pesajes` responde 400 por el token (`La autorizacion no existe` / `La autorizacion ya fue utilizada`):
  - se descarta la autorización;
  - se cierra la tara;
  - vuelve el Bloqueo Crítico sobre la misma muestra.

  El toast rojo automático explica el motivo.
- `TaraPesajeDialog` recibe una prop opcional `supervisor: string | null` y, cuando no es `null`, pinta la línea "Autorizado por {supervisor}".
- Tipos nuevos en `pesajes.types.ts`.
- `CLAUDE.md`: la sección "Báscula" deja de decir que el PIN es local.

**Fuera (para specs futuros):**

- Una pantalla para que un `ADMIN` asigne PINs (`PATCH /auth/usuarios/:id/pin`). Hoy el front no tiene ninguna pantalla de usuarios; mientras tanto el PIN se asigna por Swagger (`/docs`) o Postman.
- Pedir el PIN **después** de la tara para que coincida con la regla del backend (neto sobre el máximo). Se mantiene el bloqueo por peso bruto. Ver Decisiones.
- Pedir PIN para pesos **bajo** el mínimo. El backend tampoco lo pide.
- Mostrar en el historial o en el detalle de un pesaje quién lo autorizó. El backend no devuelve `aprobado_con_excepcion_por` en ninguna lectura.
- Límite de intentos o bloqueo tras PINs fallidos en el front. Sería una protección de mentira, porque el backend no tiene límite.
- Guardar el token entre recargas. Vive en memoria; recargar obliga a pedir el PIN otra vez.
- Cambiar los textos del `BloqueoCriticoDialog` o del botón "Autorizar Lote".

---

## Modelo de datos

### Tipos (`src/presentation/types/pesajes/pesajes.types.ts`)

```ts
export interface CrearPesajeBody {
    lote_id: number
    peso_bruto: number
    tara?: number
    /** SPEC 38 del backend. Se omite si no hubo PIN. */
    autorizacion_token?: string
}

export interface ValidarPinBody {
    pin: string
}

export interface AutorizacionSupervisor {
    /** UUID de un solo uso; se consume solo si el neto supera el máximo. */
    token: string
    /** `complete_name` del supervisor, para mostrarlo en la tara. */
    supervisor: string
}

export interface ValidarPinResponse {
    ok: boolean
    msg: string
    autorizacion: AutorizacionSupervisor
}
```

### El contrato del backend

| Llamada | Respuesta | Qué hace el front |
| --- | --- | --- |
| `POST /pesajes/validar-pin` → 200 | `{ ok, msg: 'PIN valido', autorizacion: { token, supervisor } }` | Guarda la autorización y abre la tara. |
| `POST /pesajes/validar-pin` → 400 `PIN incorrecto` | Mismo mensaje para PIN inexistente, supervisor inactivo o sin rol | El diálogo pinta "El PIN ingresado es incorrecto." y vacía el campo. |
| `POST /pesajes/validar-pin` → red, timeout o 5xx | — | El diálogo pinta "Error al validar el PIN. Intente de nuevo." (la rama `catch` que ya existe). |
| `POST /pesajes` con token → 400 `La autorizacion no existe` / `La autorizacion ya fue utilizada` | No se guardó nada | Toast rojo, se descarta la autorización, se cierra la tara y vuelve el bloqueo. |
| `POST /pesajes` con token y un neto que no supera el máximo | 201; el backend **ignora** el token y no lo consume | Nada especial: el pesaje se guarda sin supervisor. |

Un 400 de `validar-pin` **no es un 401**, a propósito: el backend lo eligió para que el interceptor no cierre la sesión del operario. El hook no tiene que hacer nada especial para esto.

### Estado en `useControlCalidad`

`autorizado: boolean` se reemplaza por `autorizacion: AutorizacionSupervisor | null`. Se resetea a `null` en los mismos tres puntos donde hoy se resetea `autorizado`:

- cuando la muestra se invalida (`pesoEstable === null`);
- al guardar;
- al cancelar la tara.

Se agrega un cuarto punto: el 400 de token.

`guardarPesaje` devuelve `PesajeCreado | 'autorizacion-invalida' | null`. El literal es lo único que distingue el 400 de token de cualquier otro fallo, como un lote cerrado o la falta de vínculo. La distinción se hace con `isInvalidAuthorizationError(error)` (`hooks/pesajes/autorizacionPin.ts`), que pide `esSolicitudInvalida(error)` (status 400, helper nuevo en `core/http-errors.ts`; `esValidacion` es 422 y no sirve acá) y además que el `message` sea uno de los dos textos del backend.

---

## Plan de implementación

1. **Tipos y hook.** Agregar los tipos a `pesajes.types.ts`. Crear `useValidateSupervisorPin` con `useExecuteMutation<ValidarPinResponse, ValidarPinBody>('/pesajes/validar-pin')` y un `onError` vacío, para que el error lo pinte el diálogo. Todavía no se usa en ningún lado, así que la app se comporta igual.
2. **PIN contra el backend.** En `useControlCalidad`:
   - reemplazar `autorizado` por `autorizacion`;
   - hacer `handleAutorizarConPin` async con el hook;
   - borrar `PIN_SUPERVISOR`;
   - quitar `VITE_SUPERVISOR_PIN` de `.env.example`.

   `BloqueoCriticoDialog` no cambia, porque su `onAutorizar` ya acepta `Promise<boolean>`. Prueba manual: el PIN de un supervisor real abre la tara, `1234` (si no es de nadie) pinta "PIN incorrecto" y el backend apagado pinta "Error al validar el PIN".
3. **Token en el guardado.**
   - `usePesajes.guardarPesaje` recibe `autorizacionToken?` y lo manda como `autorizacion_token`.
   - `confirmarTara` pasa `autorizacion?.token`.
   - Crear `autorizacionPin.ts` con `isInvalidAuthorizationError`.
   - Ante `'autorizacion-invalida'`, `confirmarTara` hace `setAutorizacion(null)` y cierra la tara sin `reiniciarPesaje()`, así la misma muestra vuelve a disparar el bloqueo.

   Prueba manual: pesar sobre el máximo con PIN y verificar en MySQL `aprobado_con_excepcion_por`. Para forzar el 400, marcar a mano la autorización como usada antes de guardar: tiene que volver a aparecer el bloqueo.
4. **Supervisor en la tara.** Agregar la prop `supervisor` a `TaraPesajeDialog` y pasarle `autorizacion?.supervisor ?? null` desde la ruta. Prueba manual: tras el PIN, la tara dice "Autorizado por {nombre}"; un pesaje dentro del rango abre la tara sin esa línea.
5. **`CLAUDE.md`.** En la sección "Báscula", el bloqueo crítico pasa a validar contra `POST /pesajes/validar-pin` y a mandar el token. Anotar que el bloqueo es por peso bruto y la regla del backend por neto.

---

## Criterios de aceptación

- [X] `VITE_SUPERVISOR_PIN` no aparece en `src/` ni en `.env.example`.
- [X] Con el peso estable sobre el máximo aparece el Bloqueo Crítico, igual que antes.
- [X] Un PIN válido llama a `POST /pesajes/validar-pin` con `{ pin }` y abre el diálogo de tara.
- [X] El diálogo de tara muestra "Autorizado por {supervisor}" con el `complete_name` que devolvió el backend.
- [X] Un PIN que no es de nadie pinta "El PIN ingresado es incorrecto." dentro del diálogo, vacía el campo, no lanza toast y no cierra la sesión.
- [X] Con el backend caído, el diálogo pinta "Error al validar el PIN. Intente de nuevo." y sigue abierto.
- [X] El guardado tras el PIN manda `autorizacion_token` en el body de `POST /pesajes`, y la fila queda con `aprobado_con_excepcion_por` igual al supervisor.
- [X] Un pesaje dentro del rango no manda `autorizacion_token` (la clave no está en el body).
- [X] Un pesaje bajo el mínimo se guarda sin bloqueo y sin token, como antes.
- [X] Si `POST /pesajes` responde 400 `La autorizacion ya fue utilizada`, se ve el toast rojo, se cierra la tara y vuelve el Bloqueo Crítico sin volver a pesar.
- [X] Un 400 de `POST /pesajes` por otro motivo (por ejemplo, un lote cerrado) deja la tara abierta como hoy y no vuelve a pedir el PIN.
- [X] Si la muestra se invalida con la tara abierta, la autorización se descarta y el siguiente peso estable sobre el máximo vuelve a pedir el PIN.
- [X] Cancelar la tara de un peso autorizado descarta la autorización.
- [X] Después de guardar, el pesaje siguiente sobre el máximo vuelve a pedir el PIN: el token no se reutiliza.
- [X] Un PIN pedido para un bruto sobre el máximo cuya tara deja el neto dentro del rango se guarda con 201, y la autorización queda sin usar en MySQL.
- [X] `npx tsc --noEmit` y `npm run test` pasan.

---

## Decisiones

- **Sí:** validar el PIN en el backend y borrar `VITE_SUPERVISOR_PIN`. Un PIN dentro del bundle no es un secreto.
- **No:** mantener la variable como respaldo si el backend falla. Un respaldo con un PIN conocido anula el control; con el backend caído no se puede guardar el pesaje de todas formas.
- **Sí:** el hook de `validar-pin` trae `onError` propio y no lanza toast. El diálogo ya pinta el error en línea, igual que `useLogin`. Un toast flotante encima del mensaje en rojo sería ruido.
- **Sí:** el nombre del supervisor se muestra en el diálogo de tara. Es el paso siguiente al PIN y donde está mirando el operario. Decisión del usuario.
- **No:** mostrarlo solo en un toast. Desaparece antes de guardar.
- **Sí:** ante un 400 de token se vuelve a pedir el PIN sobre la misma muestra. Reintentar con el mismo token fallaría igual. Decisión del usuario.
- **Sí:** el 400 de token se reconoce por el texto exacto del backend. Un 400 de `POST /pesajes` también puede ser un lote cerrado o una tara inválida, y solo el de token tiene que reabrir el bloqueo. Si el backend cambia esos textos, el caso cae al comportamiento de cualquier otro 400. Ver riesgos.
- **Sí:** se mantiene el bloqueo por peso **bruto**. Decisión del usuario. Es más conservador y no reordena el flujo. Si la tara deja el neto dentro del rango, el backend ignora el token sin gastarlo.
- **No:** pedir el PIN después de la tara. Sería exacto contra el backend, pero reordena `useControlCalidad` y el diálogo.
- **Sí:** la autorización se descarta cuando la muestra se invalida. Es el comportamiento que ya existe con `autorizado`: el supervisor autorizó un peso que vio, no el que venga después. El token que se descarta queda sin usar en el backend, y eso es inofensivo.
- **Sí:** la autorización vive solo en el estado de React. No va a `localStorage` porque el token sirve para cualquier lote y cualquier peso: guardarlo dejaría una autorización reutilizable fuera de la vista del supervisor.
- **No:** una pantalla de asignación de PINs en este spec. Decisión del usuario. No hay pantalla de usuarios donde colgarla.
- **No:** cambiar `BloqueoCriticoDialog`. Su contrato `onAutorizar: (pin) => boolean | Promise<boolean>` ya cubre el caso async.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El SPEC 38 del backend no está mergeado: contra un backend sin él, `validar-pin` responde 404 y ningún PIN autoriza | Falla cerrado: el diálogo pinta "Error al validar el PIN". Desplegar el backend antes que este front. |
| El PIN de prueba `1234` deja de funcionar | Esperado. Un `ADMIN` tiene que asignar un PIN a un usuario `SUPERVISOR` por Swagger antes de probar, y hoy no existe ninguno con ese rol. |
| Un front viejo sigue desplegado con `VITE_SUPERVISOR_PIN` | Sus pesajes quedan con `aprobado_con_excepcion_por` en `NULL`. El backend lo acepta por diseño y queda listado en MySQL. |
| El backend cambia el texto de los 400 de token | El caso deja de reabrir el bloqueo y se comporta como cualquier 400: toast y tara abierta. Los textos viven en una sola constante de `autorizacionPin.ts`. |
| Fuerza bruta desde la pantalla: 10.000 PINs sin límite de intentos | Riesgo del backend, aceptado en su SPEC 38. Un límite en el front no protege, porque la API se llama directo. |
| El operario ve un bloqueo, la tara deja el neto dentro del rango y el pesaje no registra supervisor | Correcto según el backend: ese pesaje no necesitaba autorización. Documentado en `CLAUDE.md`. |

---

## Lo que **no** entra en este spec

- La pantalla de asignación de PINs para `ADMIN`.
- Pedir el PIN después de la tara, o para pesos bajo el mínimo.
- Mostrar quién autorizó en el historial o en el detalle del pesaje.
- Límite de intentos en el front.
- Persistir la autorización entre recargas.
- Cambiar los textos o el diseño del `BloqueoCriticoDialog`.

Cada uno de estos, si se necesita, va en su propio spec.
