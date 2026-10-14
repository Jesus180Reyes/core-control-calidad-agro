# SPEC 19 — Edición de clientes desde la inspección

> **Estado:** Approved
> **Depende de:** SPEC 41 del backend (`core-control-calidad-agro-backend/specs/41-edicion-de-clientes.md`), implementado en la rama `spec-41-edicion-de-clientes` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-14
> **Objetivo:** Que el ítem **Editar Cliente** del menú de cada fila de `/inspeccion-clientes` abra un `CustomDialog` con un formulario que llama a `PATCH /clientes/:id` enviando solo los campos que el usuario cambió.

---

## Por qué existe este spec

En `ClientRowActions` ya existe el ítem **Editar Cliente**, pero solo hace `console.log`. Hasta ahora no había dónde guardar el cambio: el backend no tenía ningún endpoint para editar un cliente. El SPEC 41 del backend agregó `PATCH /clientes/:id`.

El backend deja editar a cualquier usuario autenticado. **Quién ve el botón lo decide el front**, con un permiso nuevo `EDITAR-CLIENTE`. Fue una decisión explícita del SPEC 41 de allá.

---

## Alcance

**Entra:**

- Componente nuevo `EditClienteDialog` (`presentation/components/inspeccion-clientes/`), sobre `CustomDialog`, con la misma forma que `RejectClienteDialog`.
- Formulario con los campos editables que ya tiene la creación, menos el correo: **Nombre**, **Producto**, **Teléfono** y **Dirección de planta**.
- **Código de exportación** se muestra deshabilitado, como referencia. No viaja en el body.
- Precarga desde la fila (`Cliente`): nombre, teléfono y dirección. El producto se preselecciona buscando por nombre en el catálogo de productos.
- Solo se envían los campos que el usuario cambió (`dirtyFields`).
- El botón **Guardar cambios** queda deshabilitado mientras no haya cambios o mientras se guarda.
- Nombre y dirección se pasan a mayúsculas, igual que en la creación.
- Un campo que vino con dato no se puede dejar vacío.
- Hook nuevo `useEditarCliente` (`presentation/hooks/clientes/`) sobre `useExecuteMutation` con `PATCH`. Al guardar con éxito muestra un toast verde e invalida `['clientes']`.
- Permiso nuevo `EDITAR-CLIENTE` en `PERMISSIONS`. El ítem del menú se esconde con `<Can>`.
- SQL para sembrar `EDITAR-CLIENTE` en el backend, para los roles `ADMIN` y `SUPERVISOR`.
- Tipo nuevo `EditarClienteBody` en `clientes.types.ts`.
- Manual de usuario: sección nueva y línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Editar **Ubicación** (longitud y latitud) y **Constancia de exoneración**. El backend los acepta, pero la creación tampoco los pide.
- Editar el **Correo de contacto**. El backend lo acepta, pero la lista no lo devuelve: el campo arrancaría vacío sin que el usuario sepa si el cliente ya tiene uno. Decisión del usuario durante la implementación.
- Editar el RTN o el código de exportación. El backend no lo permite.
- Editar los operadores vinculados (`usuario_ids`). El backend no tiene endpoint para eso.
- Mostrar el RTN en el diálogo. La lista no lo devuelve.
- Precargar el correo o tener el `producto_id` exacto. Haría falta que el backend devuelva más campos en `GET /clientes/all` o que exista un `GET /clientes/:id`.
- Vaciar un campo. El backend no lo permite.
- Editar desde `/clientes`, la grilla de tarjetas para pesar. No tiene menú de acciones.
- Reemplazar los permisos escritos como texto (`'CREAR-CLIENTE-NUEVO'`) en `_portal.inspeccion-clientes.tsx` por `PERMISSIONS`.

---

## Modelo de datos

### El contrato del backend

`PATCH /clientes/:id` (SPEC 41 del backend):

| Respuesta | Cuándo | Qué hace el front |
| --- | --- | --- |
| 200 `{ ok, msg: 'Cliente actualizado correctamente' }` | Se guardó | Toast verde con el `msg`, invalida `['clientes']` y cierra el diálogo. |
| 400 `Debe enviar al menos un campo a editar` | Body sin campos editables | No pasa: el botón está deshabilitado sin cambios. |
| 400 del DTO (vacío, `null`, largo excedido) | Campo inválido | No debería pasar, porque el schema del front aplica las mismas reglas. Si pasa, toast rojo automático y el diálogo sigue abierto. |
| 400 `El cliente con id 'X' ya fue rechazado` / `no existe` | Otro usuario lo rechazó mientras tanto | Toast rojo automático, el diálogo sigue abierto. |
| 400 `El producto ... no existe` / `no esta activo` | Producto dado de baja mientras tanto | Toast rojo automático. |

- `rtn` y `codigo_exportacion` no se mandan nunca. Si llegaran, el backend los descarta.
- El backend no valida `cliente_operador` ni el rol. El permiso del front es lo único que esconde el botón.

### Tipos (`src/presentation/types/clientes/clientes.types.ts`)

```ts
/** SPEC 41 del backend. Solo los campos que cambiaron; nunca vacío. */
export type EditarClienteBody = Partial<{
    nombre: string
    producto_id: number
    correo_contacto: string
    telefono: string
    direccion_planta: string
}>
```

- `correo_contacto` queda en el tipo porque es parte del contrato del backend, aunque el formulario no lo envía.

### Schema (`src/presentation/schema/editar-cliente/editarClienteSchema.ts`)

Es una fábrica, `createEditarClienteSchema(cliente: Cliente)`, igual que `createTaraSchema`, porque las reglas dependen de con qué vino precargado cada campo.

| Campo | Regla |
| --- | --- |
| `nombre` | `trim`, mínimo 1 (`El nombre es requerido`), máximo 100, `.toUpperCase()` |
| `producto_id` | entero positivo, opcional |
| `telefono` | `trim`, máximo 20. Mínimo 1 **solo si** `cliente.telefono` venía con dato (`No se puede dejar vacío`) |
| `direccion_planta` | `trim`, máximo 16383, `.toUpperCase()`. Mínimo 1 **solo si** `cliente.direccion_planta` venía con dato |
| `codigo_exportacion` | `string`, solo para mostrar. Nunca se envía. |

- Los máximos son los del DTO del backend (SPEC 41), así un valor largo se marca en el campo y no como un 400.
- `''` es válido en un campo que vino vacío: no cuenta como cambio, porque es su valor por defecto.

### Valores iniciales

```ts
{
    nombre: cliente.nombre,
    producto_id: productos.find((p) => p.nombre === cliente.producto)?.id,
    telefono: cliente.telefono ?? '',
    direccion_planta: cliente.direccion_planta ?? '',
    codigo_exportacion: cliente.codigo_exportacion ?? '',
}
```

- Si el producto no aparece en el catálogo, el selector arranca vacío con el placeholder "Sin cambios". Puede pasar si el producto está inactivo o si el nombre no coincide.

### Body

En el `onSubmit` se arma con los datos ya transformados por el schema, quedándose solo con las claves de `form.formState.dirtyFields`, menos `codigo_exportacion`:

```ts
// { telefono: '9999-0000' } si solo cambió el teléfono
const body = pickDirty(data, dirtyFields) satisfies EditarClienteBody
```

- Un campo que vino vacío y se dejó vacío no está en `dirtyFields`, así que no viaja.
- `pickDirty` además descarta los `''` y los `undefined`: un campo que vino vacío y en el que se tipearon solo espacios queda en `dirtyFields`, pero el `trim` lo deja en `''`, y el backend no acepta vacíos. Un campo que vino con dato no puede llegar vacío porque el schema lo frena antes.
- El botón se deshabilita con `!form.formState.isDirty || isPending`, así que el body nunca sale vacío.

### Hook

```ts
// src/presentation/hooks/clientes/useEditarCliente.tsx
export const useEditarCliente = ({ clienteId }: { clienteId: number }) => {
    const queryClient = useQueryClient()
    return useExecuteMutation<{ ok: boolean, msg: string }, EditarClienteBody>(`/clientes/${clienteId}`, {
        method: 'PATCH',
        onSuccess: (data) => {
            toast.success(data.msg)
            void queryClient.invalidateQueries({ queryKey: ['clientes'] })
        },
    })
}
```

- Sin `onError`: el toast rojo lo pone `withErrorToast`, como dice `CLAUDE.md`.
- Invalidar `['clientes']` refresca por prefijo `['clientes']` y `['clientes', 'all', params]`, igual que el rechazo.

### Diálogo

- `title="Editar cliente"`, `description="Cambie los datos y pulse Guardar cambios."`, `size="lg"`.
- Footer: **Cancelar** (`secondary`) y **Guardar cambios** (`form="form-editar-cliente"`, `type="submit"`). Mientras guarda, el botón dice **Guardando...**.
- Los campos van en una grilla de dos columnas, como `CreateClienteForm`: Nombre, Código de exportación (deshabilitado), Teléfono, Dirección de planta (a todo el ancho, `sm:col-span-2`), y abajo el selector de Producto con `showSearch` y `valueAsNumber`.
- `EditClienteDialog` recibe `open` y `onOpenChange`, igual que `RejectClienteDialog`. Con `open` en `false` no pinta nada; abierto, monta un `ErrorBoundary` y un `Suspense` (porque `useGetCatalogosProductos` suspende) alrededor de `EditClienteForm`, el formulario interno. Así `useForm` toma los valores iniciales al montarse, y al cerrar se desmonta, sin `form.reset()`. Tampoco se pide el catálogo hasta que alguien abre el diálogo.
- Los fallbacks son el mismo diálogo **Editar cliente**: con el `LoadingState` adentro mientras carga, y con "No se pudo cargar el catálogo de productos." más **Cerrar** y **Reintentar** si falla. Pintados en la fila deformarían la celda de acciones de la tabla.
- Al guardar con éxito se cierra con un `useEffect` sobre `isSuccess`, como `RejectClienteDialog`.

### Permiso

En `src/presentation/types/auth/permissions.ts`:

```ts
EDITARCLIENTE: 'EDITAR-CLIENTE',
```

En `ClientRowActions`, el ítem **Editar Cliente** pasa a `permission: PERMISSIONS.EDITARCLIENTE` y `run: () => setselectedAction('EDITAR_CLIENTE')`.

SQL a ejecutar a mano en el MySQL del backend, en cada entorno:

```sql
INSERT INTO catalogo_permisos (codigo, nombre, descripcion)
VALUES ('EDITAR-CLIENTE', 'Editar cliente', 'PATCH /clientes/:id: editar los datos de un cliente activo');

INSERT INTO permisos (rol_id, permiso_id)
SELECT r.id, c.id
FROM roles r
JOIN catalogo_permisos c ON c.codigo = 'EDITAR-CLIENTE'
WHERE r.nombre IN ('ADMIN', 'SUPERVISOR');
```

- Los roles se resuelven por nombre, en mayúsculas, porque los ids cambian entre entornos.
- `GET /permisos/me` se lee una vez, al iniciar sesión. Un usuario con la sesión abierta no ve el ítem hasta que cierre sesión y vuelva a entrar.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/types/clientes/clientes.types.ts` | Tipo `EditarClienteBody`. |
| `src/presentation/types/auth/permissions.ts` | `EDITARCLIENTE: 'EDITAR-CLIENTE'`. |
| `src/presentation/schema/editar-cliente/editarClienteSchema.ts` | Nuevo `createEditarClienteSchema` y su tipo. |
| `src/presentation/hooks/clientes/useEditarCliente.tsx` | Nuevo. |
| `src/presentation/components/inspeccion-clientes/EditClienteDialog.tsx` | Nuevo. |
| `src/presentation/components/inspeccion-clientes/ClientRowActions.tsx` | Ítem con permiso y `run` real; monta el diálogo. |
| `docs/manual/MANUAL.md` | Sección 5.6, fila en la tabla del administrador y línea en **Sin publicar**. |

---

## Plan de implementación

1. **Sembrar el permiso.** Ejecutar el SQL en el MySQL del backend. Verificación: `GET /permisos/me` con un `ADMIN` y con un `SUPERVISOR` incluye `EDITAR-CLIENTE`; con un `OPERADOR`, no.
2. **Tipos y permiso.** Agregar `EditarClienteBody` y `EDITARCLIENTE`. Todavía nadie los usa. Verificación: `npx tsc --noEmit` sin errores, y el aviso de `advertirPermisosDesconocidos` desaparece en desarrollo.
3. **Schema.** Crear `createEditarClienteSchema` con las reglas del modelo de datos. Verificación: `npx tsc --noEmit` sin errores.
4. **Hook.** Crear `useEditarCliente`. Todavía nadie lo llama.
5. **Diálogo.** Crear `EditClienteDialog` con el formulario, los valores iniciales, el armado del body desde `dirtyFields` y el botón deshabilitado sin cambios. Todavía nadie lo monta.
6. **Conectar el menú.** En `ClientRowActions`, el ítem **Editar Cliente** usa `PERMISSIONS.EDITARCLIENTE` y abre el diálogo, con `open={selectedAction === 'EDITAR_CLIENTE'}`. Prueba manual: cambiar el teléfono de un cliente, guardar y ver el teléfono nuevo en la tabla sin recargar.
7. **Manual.** En `docs/manual/MANUAL.md`:
   - Sección nueva **5.6 Editar un cliente** en el capítulo del supervisor, con los pasos: **Clientes** → **⋯** → **Editar Cliente** → cambiar los datos → **Guardar cambios**. Debe decir que el RTN y el código de exportación no se pueden cambiar, y que un dato cargado no se puede dejar vacío.
   - En la tabla del capítulo del administrador, la fila "Editar clientes | 5.6".
   - El índice del manual, si lista las secciones.
   - Una línea en **Sin publicar**.
   - Si hace falta una captura nueva, su fila en `docs/manual/README.md` como **Pendiente**.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run test` pasan.
- [ ] Con un `ADMIN` o un `SUPERVISOR`, el menú de cada fila de `/inspeccion-clientes` muestra **Editar Cliente**.
- [ ] Con un `OPERADOR`, el ítem no aparece.
- [ ] **Editar Cliente** abre el diálogo **Editar cliente** con nombre, teléfono y dirección precargados desde la fila.
- [ ] El selector de Producto aparece preseleccionado con el producto del cliente cuando el nombre coincide con el catálogo.
- [ ] **Código de exportación** se ve con el valor del cliente y no se puede editar.
- [ ] No hay campo de RTN.
- [ ] Sin tocar nada, **Guardar cambios** está deshabilitado.
- [ ] Al cambiar solo el teléfono, la petición es `PATCH /clientes/:id` con body `{ "telefono": "..." }` y nada más.
- [ ] Al cambiar el nombre a minúsculas, el body lleva el nombre en mayúsculas.
- [ ] Ninguna petición lleva `rtn` ni `codigo_exportacion`.
- [ ] Al guardar con éxito, aparece el toast "Cliente actualizado correctamente", el diálogo se cierra y la tabla muestra el dato nuevo sin recargar.
- [ ] Vaciar el nombre, o un teléfono o dirección que venían con dato, marca el error en el campo y no envía nada.
- [ ] No hay campo de correo de contacto, y la dirección de planta ocupa todo el ancho.
- [ ] Un teléfono de más de 20 caracteres marca el error en el campo.
- [ ] Un 400 del backend (por ejemplo, el cliente fue rechazado mientras tanto) muestra un toast rojo con el mensaje del backend y deja el diálogo abierto.
- [ ] Cerrar el diálogo y volver a abrirlo muestra los datos de la fila, no lo que se había tipeado.
- [ ] El manual tiene la sección 5.6, la fila en la tabla del administrador y su línea en **Sin publicar**.

---

## Decisiones

- **Sí:** el diálogo se abre desde el ítem **Editar Cliente** que ya existe en `ClientRowActions`. Decisión del usuario: un `CustomDialog` con el formulario.
- **Sí:** el formulario solo tiene los campos que ya pide la creación. Decisión del usuario. Ubicación y constancia quedan para otro spec.
- **No:** el correo de contacto. Decisión del usuario durante la implementación: sin precarga, un campo vacío no dice si el cliente ya tiene correo.
- **No:** los ocho campos que acepta el backend. Ubicación y constancia no tienen campo ni en la creación.
- **Sí:** precargar solo lo que trae la fila y enviar solo lo que cambió. Decisión del usuario. No hace falta tocar el backend.
- **No:** ampliar `GET /clientes/all` o agregar `GET /clientes/:id` en el backend. Cambia una respuesta publicada, o abre la trampa de `:id` junto a `/clientes/all`.
- **Sí:** preseleccionar el producto buscando por nombre en el catálogo. Es la única forma sin cambiar el backend. Si no coincide, arranca vacío y no se envía.
- **Sí:** permiso nuevo `EDITAR-CLIENTE` para `ADMIN` y `SUPERVISOR`. Decisión del usuario.
- **No:** reusar `CREAR-CLIENTE-NUEVO`. Hoy lo tiene `OPERADOR`, que no debe editar.
- **Sí:** el botón se deshabilita sin cambios. Decisión del usuario. El 400 de "al menos un campo" nunca llega a dispararse.
- **Sí:** mayúsculas en nombre y dirección, igual que la creación. Decisión del usuario.
- **Sí:** código de exportación visible y deshabilitado. Decisión del usuario. El RTN no se muestra porque la lista no lo devuelve.
- **Sí:** el schema es una fábrica que recibe el cliente. Un campo vacío es válido o no según con qué vino precargado, y eso no se puede escribir en un schema fijo.
- **No:** reusar `createClienteSchema`. Exige `rtn` y `usuario_ids`.
- **Sí:** el formulario se monta solo mientras el diálogo está abierto, pero el diálogo recibe `open` como `RejectClienteDialog`. Decisión del usuario: la condición de montaje vive dentro del diálogo, no en `ClientRowActions`. `useForm` toma los valores iniciales al montarse, sin `useEffect` de `reset`, y el `Suspense` del catálogo queda contenido.
- **Sí:** el hook no declara `onError`. Es la regla de `CLAUDE.md`. `useCrearCliente` y `useRechazarCliente` sí lo declaran, pero no se copian en eso.
- **Sí:** nombres `useEditarCliente` y `EditClienteDialog`, contra la regla de identificadores nuevos en inglés. Es el mismo criterio del SPEC 18: la carpeta ya tiene `useCrearCliente`, `useRechazarCliente` y `RejectClienteDialog`, y romper el patrón confunde más que lo que aporta la regla.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 41 del backend | `PATCH /clientes/:id` responde 404 y el toast rojo lo muestra. Este spec se mergea después del backend. |
| No se sembró `EDITAR-CLIENTE` en un entorno | Nadie ve el ítem. Falla cerrado. El paso 1 se repite en cada entorno. |
| El permiso es solo visual: cualquiera con un token puede llamar `PATCH /clientes/:id` directo | Riesgo aceptado en el SPEC 41 del backend. El backend guarda `actualizado_por`. |
| El nombre del producto no coincide con el catálogo | El selector arranca vacío y el producto no se envía, así que no se pisa. El usuario puede elegirlo. |
| Cambiar el nombre cambia el nombre que muestran las facturas ya registradas | Riesgo aceptado en el SPEC 41 del backend. El manual no lo menciona porque las facturas no tienen pantalla en el front. |
| Un usuario con la sesión abierta cuando se siembra el permiso no ve el ítem | Lo verá al volver a iniciar sesión, porque los permisos se leen al hacer login. |
| La primera apertura con el catálogo de productos sin caché tarda un instante | El `Suspense` muestra el fallback. El catálogo queda en caché 10 minutos. |

---

## Lo que **no** entra en este spec

- Ubicación, constancia de exoneración y correo de contacto en el formulario.
- Editar RTN, código de exportación u operadores vinculados.
- Precargar el correo o el `producto_id` exacto desde el backend.
- Vaciar campos.
- Editar desde `/clientes`.
- Limpiar los permisos escritos como texto en `_portal.inspeccion-clientes.tsx`.

Cada uno de estos, si se necesita, va en su propio spec.
