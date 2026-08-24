# SPEC 05 — Guardar el pesaje en la base de datos

> **Estado:** Implemented
> **Depende de:** SPEC 03, SPEC 04
> **Fecha:** 2026-08-24
> **Objetivo:** Conectar el botón "Guardar en Base de Datos" de `/control-calidad` al endpoint `POST /pesajes`, para que cada muestra estabilizada del lote quede registrada y la pantalla se reinicie lista para el siguiente bulto.

---

## Por qué existe este spec

Toda la cadena ya está armada y no desemboca en ningún lado:

- `_portal.control-calidad.tsx:96` pasa `onGuardar={() => console.log('guardando')}`. El botón principal de la pantalla —el que el operario toca en cada bulto— escribe en la consola.
- `useSerialScale` ya confirma la muestra: `pesoEstable` se fija cuando termina la ventana de estabilización (`useSerialScale.tsx:271`) y vuelve a `null` en cada `reiniciarPesaje()`. Ese número existe, se muestra, y nadie lo guarda.
- `useControlCalidad.tsx:98` valida el PIN de supervisor contra la constante `"1234"` y al aprobarlo solo cierra el dialog. Un pesaje fuera de rango autorizado por un supervisor hoy no deja rastro.
- El lote ya llega completo por el `state` del router (`useLotes.tsx:19`), así que `lote_id` está disponible sin ninguna petición extra.

Este spec cierra ese último tramo: de la muestra confirmada al registro en la base.

---

## Contrato del endpoint

**`POST /pesajes`**

Body:

```json
{
    "lote_id": 4,
    "estado_calidad_id": 1,
    "peso_bruto": 22.4,
    "tara": 1
}
```

- `lote_id` — el `id` del `Lote` que viaja en el `state` del router.
- `estado_calidad_id` — se manda **siempre `1`**. El backend recalcula el estado real; el campo se manda igual porque el contrato lo declara (ver Decisiones).
- `peso_bruto` — número. Sale de `scale.pesoEstable`.
- `tara` — **opcional y no se manda en este spec.** No hay ningún campo en la pantalla que la capture.

Respuesta:

```json
{
    "ok": true,
    "msg": "Pesaje guardado correctamente",
    "pesaje": {
        "id": 5,
        "peso_neto": 21.4,
        "fuera_de_rango": true
    }
}
```

De la respuesta solo se consume `msg`, que es el texto del toast de éxito. `id`, `peso_neto` y `fuera_de_rango` se tipan pero no se usan (ver Decisiones).

---

## Alcance

**Dentro:**

- Tipos `CrearPesajeBody`, `PesajeCreado` y `CrearPesajeResponse` en `src/presentation/types/pesajes/pesajes.types.ts`.
- Hook `usePesajes(lote)` en `src/presentation/hooks/pesajes/usePesajes.tsx`, sobre `useExecuteMutation`.
- `sonner` agregado con el CLI de shadcn y `<Toaster />` montado en `__root.tsx`.
- `useControlCalidad` expone `guardarPesaje` y `guardando`, y los cablea a los dos disparadores: el botón "Guardar en Base de Datos" y el "Autorizar Lote" del `BloqueoCriticoDialog`.
- Tras un guardado exitoso: toast verde con el `msg` del servidor y `scale.reiniciarPesaje()`.
- Tras un guardado fallido: toast rojo con el mensaje del servidor o el texto derivado del error tipado; el peso **no** se reinicia.
- `MonitoreoBasculaCard` recibe `guardando` y lo usa para deshabilitar el botón y mostrar su spinner.
- `mostrarBloqueo` pasa a exigir además `scale.pesoEstable !== null`.
- Invalidación de `['lotes', 'cliente', <id>]` después de cada guardado exitoso.
- Una línea en `CLAUDE.md` sobre `sonner` como el mecanismo de notificaciones del proyecto.

**Fuera de alcance (para specs futuros):**

- **Validar el PIN de supervisor contra el backend.** Decisión explícita: sigue siendo la constante `"1234"` de `useControlCalidad.tsx:101`.
- **Capturar la tara.** Ni input en pantalla ni campo en el `Lote`.
- **"Imprimir Etiqueta".** El botón sigue con su `console.log`; no consume el `id` del pesaje creado.
- Contador de bultos guardados, peso acumulado del lote o cualquier resumen de la sesión de pesaje en pantalla.
- Historial de pesajes del lote (`GET /pesajes`), el ícono de reloj del header y la pantalla que lo listaría.
- Cerrar el lote o cambiar su `estado` desde el front.
- Mandar `estado_calidad_id` derivado del rango, o un selector de estado de calidad en la pantalla.
- Marcar en el body que el pesaje fue autorizado por un supervisor.
- Guardado offline, cola de reintentos o persistencia local de pesajes no enviados.
- Tests de vitest de `usePesajes`.

---

## Modelo de datos

### Tipos nuevos — `src/presentation/types/pesajes/pesajes.types.ts`

Espejan el wire format tal cual, `snake_case` incluido, igual que `Lote` y `Cliente`.

```ts
export interface CrearPesajeBody {
    lote_id: number
    estado_calidad_id: number
    peso_bruto: number
    /** Opcional en el API; este spec nunca la manda. */
    tara?: number
}

export interface PesajeCreado {
    id: number
    peso_neto: number
    fuera_de_rango: boolean
}

export interface CrearPesajeResponse {
    ok: boolean
    msg: string
    pesaje: PesajeCreado
}
```

No hay estado nuevo persistido en el front: el pesaje se manda y se olvida. Lo único que cambia en memoria es la caché de TanStack Query, por la invalidación de los lotes del cliente.

### Constante

```ts
/** El backend recalcula el estado real; el contrato exige el campo igual. */
const ESTADO_CALIDAD_POR_DEFECTO = 1
```

Vive en `usePesajes.tsx`, que es el único archivo que arma el body.

---

## Plan de implementación

1. **Crear `src/presentation/types/pesajes/pesajes.types.ts`** con los tres tipos de arriba. Nadie los importa todavía. Verificación: `npx tsc --noEmit` pasa.

2. **Agregar `sonner` con el CLI de shadcn** (`npx shadcn@latest add sonner`, estilo `base-nova`), que crea `src/components/ui/sonner.tsx`. Ese wrapper trae por defecto el `useTheme` de `next-themes`: hay que sustituirlo por el `useTheme` de `#/presentation/theme/ThemeProvider`, que es el que gobierna la clase del `<html>` en este proyecto. Verificación: `npx tsc --noEmit` pasa.

3. **Montar `<Toaster />` en `src/routes/__root.tsx`**, dentro de `ThemeProvider` (necesita el contexto del tema) y después de `{children}`. Posición `top-center` y `richColors`, para que el operario lo vea sin apartar la vista del peso. Verificación manual: `toast.success('probando')` desde la consola pinta el toast en claro y en oscuro.

4. **Crear `src/presentation/hooks/pesajes/usePesajes.tsx`.** Recibe `lote: Lote | null` y devuelve `{ guardarPesaje, guardando }`:
   - Adentro, `useExecuteMutation<CrearPesajeResponse, CrearPesajeBody>('/pesajes')` — método `POST` por defecto.
   - `guardarPesaje(pesoBruto: number): Promise<boolean>` — si no hay `lote`, devuelve `false` sin llamar al API. Si hay, arma `{ lote_id: lote.id, estado_calidad_id: ESTADO_CALIDAD_POR_DEFECTO, peso_bruto: pesoBruto }` y llama a `mutateAsync` dentro de un `try/catch`:
     - éxito → `toast.success(data.msg)`, invalida `['lotes', 'cliente', lote.id]` con el `queryClient` de `useQueryClient()`, devuelve `true`.
     - error → `toast.error(<mensaje derivado>)`, devuelve `false`. **Nunca relanza**: quien lo llama decide qué hacer con el `false`.
   - El mensaje de error se deriva con los helpers de SPEC 03, con la misma escalera que `derivarErrorLogin` en `useLogin.tsx`: `esDeRed || esTimeout` → `'No se pudo contactar al servidor.'`; `esHttpError` → `mensajeDelServidor(error.body) ?? 'No se pudo guardar el pesaje.'`; cualquier otro → `'Ocurrió un error inesperado al guardar.'`.
   - `guardando` es el `isPending` de la mutación.
   Verificación: `npx tsc --noEmit` pasa.

5. **Modificar `src/presentation/hooks/bascula/useControlCalidad.tsx`.** Cuatro cambios acotados; la báscula, los parámetros y el selector no se tocan:
   - Llamar a `usePesajes(lote)`.
   - `guardarPesaje()` propio, sin argumentos, para que la vista no tenga que saber de dónde sale el peso: si `scale.pesoEstable === null` devuelve `false` sin llamar al API; si no, llama a `pesajes.guardarPesaje(scale.pesoEstable)` y, **solo si devolvió `true`**, ejecuta `scale.reiniciarPesaje()`.
   - `handleAutorizarConPin`: con el PIN correcto, `setMostrarBloqueo(false)`, dispara `guardarPesaje()` y devuelve `true` en todos los casos. El resultado del guardado no cambia el retorno: el dialog se cierra igual y el fallo lo comunica el toast rojo (decisión del usuario). Con el PIN incorrecto sigue devolviendo `false` sin tocar el API.
   - El `useEffect` de `mostrarBloqueo` agrega `scale.pesoEstable !== null` a la condición, para que el dialog no pueda aparecer antes de que exista la muestra que se va a guardar.
   - El hook expone `guardarPesaje` y `guardando` en su retorno.
   Verificación: `npx tsc --noEmit` pasa y `npx vitest run` sigue en verde.

6. **Modificar `src/presentation/views/control-calidad/MonitoreoBasculaCard.tsx`**: nueva prop `guardando: boolean`, que se suma a `disabledGuardar` y reemplaza a `isStabilizing` como `isLoading` del botón primario (durante el guardado el spinner es lo correcto; durante la estabilización el botón ya está deshabilitado por `disabledGuardar`). El botón "Imprimir Etiqueta" también se deshabilita mientras `guardando`. Verificación manual: al guardar, el botón muestra el spinner y no admite un segundo click.

7. **Modificar `src/routes/(portal)/_portal.control-calidad.tsx`**: `onGuardar={() => void guardarPesaje()}` y `guardando={guardando}`, con los dos valores sacados del retorno de `useControlCalidad`. Se borra el `console.log('guardando')`. `onImprimirEtiqueta` no cambia. Verificación manual: el flujo completo contra el backend.

8. **Actualizar `CLAUDE.md`**: una línea indicando que las notificaciones van por `sonner` (`toast.success` / `toast.error`), con el `<Toaster />` en `__root.tsx`, y que los mensajes de error de mutación se derivan con los helpers de `http-errors.ts`.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` pasa sin errores.
- [x] `npx vitest run` pasa completo, con los mismos tests que hoy.
- [X] Con el peso estabilizado dentro del rango, tocar "Guardar en Base de Datos" manda un `POST /pesajes` con body `{ lote_id, estado_calidad_id: 1, peso_bruto }` y **sin** la clave `tara` (verificable en la pestaña Network).
- [X] `peso_bruto` es exactamente el número que la card mostró congelado (`pesoEstable`), no la lectura viva.
- [X] `lote_id` corresponde al lote elegido en `/lotes-clientes`.
- [X] Tras un guardado exitoso aparece un toast verde con el `msg` del servidor.
- [X] Tras un guardado exitoso la pantalla vuelve a esperar muestra: `pesoEstable` es `null` y se puede tomar otra sin retirar el producto.
- [X] Con el backend apagado, el toast es rojo y dice "No se pudo contactar al servidor.".
- [X] Con un error del servidor, el toast rojo muestra el mensaje del servidor si viene, y "No se pudo guardar el pesaje." si no.
- [X] Tras un guardado fallido el peso **no** se reinicia: el mismo número sigue en pantalla y el botón vuelve a estar disponible para reintentar.
- [X] Una petición fallida no se reintenta sola (`mutations: { retry: 0 }` de SPEC 03): en Network se ve un solo `POST`.
- [X] Mientras el `POST` está en vuelo, el botón muestra el spinner y un segundo click no dispara una segunda petición.
- [X] Con el peso por encima del máximo aparece el `BloqueoCriticoDialog`, y solo aparece cuando ya hay muestra estabilizada.
- [X] Ingresar el PIN `1234` y tocar "Autorizar Lote" cierra el dialog y manda el `POST /pesajes`.
- [X] Ingresar un PIN incorrecto muestra el error dentro del dialog y **no** manda ninguna petición.
- [X] "Rechazar Pesaje" no manda ninguna petición.
- [X] Guardar y volver a `/lotes-clientes` muestra los lotes recargados desde el API (query invalidada), sin recargar la página.
- [X] Los toasts se ven correctamente en modo claro y oscuro.

---

## Decisiones

- **Sí:** `peso_bruto` sale de `scale.pesoEstable` y no de `scale.pesoActual`. Es la muestra que la ventana de estabilización confirmó y que el operario vio congelada; `pesoActual` puede haber variado entre el render y el click, y se guardaría un número distinto al que se mostró.
- **Sí:** si `pesoEstable` es `null`, `guardarPesaje()` devuelve `false` sin llamar al API. No hay peso que guardar y no se inventa uno con la lectura viva.
- **Sí:** `mostrarBloqueo` exige `scale.pesoEstable !== null`. Hoy la condición es `esAltoRango && hayFlujoDatos && !isStabilizing`, y `isStabilizing` también es `false` en el instante entre la primera trama alta y el arranque del ticker. Sin esta guarda, el dialog podría aparecer con `pesoEstable` en `null` y el "Autorizar" no tendría nada que mandar.
- **Sí:** `estado_calidad_id` se manda fijo en `1`. Decisión del usuario: el backend calcula el estado real, pero el contrato declara el campo y mandarlo mantiene el body igual al ejemplo. Queda en una constante nombrada, no como un `1` suelto en el objeto.
- **No:** derivar `estado_calidad_id` del rango en el front. Duplicaría del lado del cliente una regla que el backend ya aplica, con el riesgo clásico de que las dos versiones se separen.
- **No:** mandar `tara`. Decisión del usuario: no hay campo en la pantalla que la capture y el API la declara opcional. Se omite la clave entera en vez de mandar `0`, que sería afirmar una tara nula.
- **Sí:** se guardan muchos pesajes por lote. Decisión del usuario: el operario pesa bulto tras bulto sin salir de `/control-calidad`, y guardar reinicia la muestra en vez de navegar.
- **No:** contador de bultos ni peso acumulado en pantalla. Decisión del usuario: el reset alcanza. Cuando haga falta saber cuántos van, sale del historial del lote, que es otro spec.
- **Sí:** `sonner` como sistema de notificaciones. No había ninguno en el proyecto. Un toast no ocupa espacio fijo en la card, no frena el flujo de pesar bulto tras bulto y queda disponible para el resto de la app.
- **No:** banner dentro de `MonitoreoBasculaCard`. Ocupa espacio permanente en la card más cargada de la pantalla y obliga a decidir cuándo se apaga.
- **No:** dialog de confirmación tras guardar. Con guardados en serie, un modal que hay que cerrar en cada bulto es exactamente el peor caso.
- **Sí:** el toast de éxito muestra el `msg` que devuelve el servidor, no un texto propio. El backend ya manda la frase; duplicarla en el front crea dos fuentes de verdad para el mismo mensaje.
- **No:** usar `fuera_de_rango` de la respuesta. Decisión del usuario: se tipa para dejar el contrato completo, pero el toast es verde siempre. El operario ya vio en pantalla si el peso estaba fuera de rango antes de guardar.
- **No:** usar el `id` ni el `peso_neto` del pesaje creado. Nada en esta pantalla los necesita; el `id` lo va a necesitar "Imprimir Etiqueta", que está fuera de alcance.
- **Sí:** con el PIN correcto el dialog se cierra y el `POST` sale, aunque el guardado falle después. Decisión explícita del usuario sobre mantener el dialog abierto con el error. Costo asumido y anotado en Riesgos: el peso sigue fuera de rango, así que el bloqueo vuelve a dispararse.
- **Sí:** `handleAutorizarConPin` devuelve `true` en cuanto el PIN es correcto, sin esperar el resultado del guardado. El booleano que consume `BloqueoCriticoDialog` significa "el PIN es válido", no "el pesaje se guardó"; mezclarlos haría que un fallo de red se presentara como "El PIN ingresado es incorrecto.".
- **No:** validar el PIN contra el backend. Decisión explícita del usuario: la constante `"1234"` sigue tal cual y su reemplazo va en su propio spec.
- **No:** marcar en el body que el pesaje fue autorizado por un supervisor. El contrato no tiene campo para eso. Anotado en Riesgos: hoy el pesaje autorizado y el normal son indistinguibles.
- **Sí:** hook propio `usePesajes` en `hooks/pesajes/`, y no la mutación dentro de `useControlCalidad`. `useControlCalidad` ya tiene 128 líneas y gobierna la báscula entera; el módulo de pesajes es dominio propio y así queda reusable por el spec del historial.
- **Sí:** `guardarPesaje` devuelve `boolean` y nunca relanza. Tiene dos disparadores con reacciones distintas —el botón reinicia el peso, el dialog no— y un booleano los cubre a los dos sin obligar a nadie a un `try/catch`.
- **Sí:** el toast lo dispara `usePesajes`, no la vista. Es el único que conoce el error crudo y los helpers de `http-errors.ts`; que la vista derivara el mensaje repartiría la lógica de errores en dos capas.
- **Sí:** el peso **no** se reinicia si el guardado falla. El producto sigue sobre la plataforma: perder la muestra obligaría a retirarlo y volver a esperar los 5 segundos de estabilización por un error de red.
- **Sí:** invalidar `['lotes', 'cliente', <id>]` tras guardar. El `Lote` trae `estado`, que el backend puede mover al registrar pesajes; sin invalidar, volver atrás muestra el estado viejo desde la caché.
- **No:** `Suspense` + `ErrorBoundary` nuevos en `/control-calidad`. `useExecuteMutation` no usa `useSuspenseQuery`; una mutación reporta su error por el toast, no por el `ErrorBoundary`.
- **No:** tests de vitest de `usePesajes`. Se mantiene la línea del SPEC 03: la verificación es `npx tsc --noEmit`, la suite existente en verde y la lista manual de arriba.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un guardado fallido no reintenta y el operario puede no ver el toast si estaba mirando la báscula, y creer que el bulto quedó registrado. | El peso **no** se reinicia cuando falla: la pantalla se queda con el mismo número y el botón activo, que es la señal permanente de que ese bulto sigue sin guardarse. |
| Al autorizar con PIN el dialog se cierra aunque el `POST` falle, y como el peso sigue fuera de rango el bloqueo se vuelve a disparar enseguida: el operario ve el mismo dialog otra vez. | Decisión explícita del usuario. El toast rojo explica el fallo, y volver a autorizar reintenta el guardado. Si molesta en planta, la alternativa (dialog abierto con el error) está documentada arriba. |
| El pesaje autorizado por un supervisor llega al backend idéntico a uno normal. La leyenda del dialog promete "historial de auditoría permanente" y hoy el body no lleva nada que lo distinga. | Fuera de alcance por falta de campo en el contrato. Anotado para cuando el API acepte una marca de autorización. |
| `estado_calidad_id: 1` fijo: si el backend algún día deja de recalcularlo, todos los pesajes quedan con el mismo estado y nadie se entera. | Es una constante nombrada en un solo archivo, con el comentario que explica por qué vale `1`. Cambiarla es una línea. |
| `reiniciarPesaje()` no exige que retiren el producto de la plataforma; si el peso no baja del umbral, la siguiente ventana de estabilización puede confirmar **la misma** muestra y guardarla dos veces. | Es el comportamiento que `useSerialScale.tsx:716` documenta a propósito ("permite tomar otra muestra sin retirar el producto"). Guardar exige un click del operario, así que no hay envío automático. Si aparecen duplicados reales, el arreglo es del lado del backend con una clave de idempotencia. |
| El `POST` sale sin `usuario_id`: el backend lo saca del token. Si una petición sale sin `Authorization`, el pesaje se atribuye mal o se rechaza. | Lo cubre el interceptor de auth del SPEC 03, que inyecta el `Bearer` en toda petición, y el 401 con token cierra sesión. |
| `sonner` es una dependencia nueva montada en `__root.tsx`, que corre también en SSR. | El wrapper de shadcn ya renderiza del lado del cliente; el paso 2 además reemplaza su `useTheme` de `next-themes` por el del proyecto, que es el único que existe acá. |
| Un `POST` lento deja el botón con spinner hasta 15 s (el `timeoutMs` del SPEC 03) y el operario podría creer que la app se colgó. | El spinner es visible y el botón deshabilitado; al vencer el timeout sale el toast rojo con "No se pudo contactar al servidor.". Si el endpoint resulta lento de verdad, `timeoutMs` es sobreescribible por petición. |
| La invalidación de `['lotes', 'cliente', id]` dispara un `GET /lotes/cliente/:id` en segundo plano en cada guardado, aunque la pantalla de lotes no esté montada. | TanStack Query no refetchea queries inactivas por defecto: la marca como obsoleta y recarga al volver a `/lotes-clientes`. Sin costo por bulto. |

---

## Lo que **no** entra en este spec

- Validar el PIN de supervisor contra el backend.
- Capturar la tara, en pantalla o desde el lote.
- "Imprimir Etiqueta" y el uso del `id` del pesaje creado.
- Contador de bultos, peso acumulado o cualquier resumen de la sesión.
- Historial de pesajes del lote y el ícono de reloj del header.
- Cerrar el lote o cambiar su estado desde el front.
- Derivar `estado_calidad_id` del rango o elegirlo en pantalla.
- Marcar el pesaje como autorizado por supervisor.
- Guardado offline y cola de reintentos.
- Tests de vitest de `usePesajes`.

Cada uno de ellos, si se hace, va en su propio spec.
