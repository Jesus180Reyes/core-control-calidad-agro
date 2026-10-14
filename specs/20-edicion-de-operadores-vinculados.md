# SPEC 20 — Edición de los operadores vinculados a un cliente

> **Estado:** Approved
> **Depende de:** SPEC 19 (`EditClienteDialog`, el patrón de diálogo que se copia, y el ítem **Editar Operadores Vinculados** ya agregado a `ClientRowActions`), SPEC 42 del backend (`core-control-calidad-agro-backend/specs/42-gestion-de-operadores-de-cliente.md`), implementado en la rama `spec-42-gestion-de-operadores-de-cliente` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-14
> **Objetivo:** Que el ítem **Editar Operadores Vinculados** del menú de cada fila de `/inspeccion-clientes` abra un `CustomDialog` que precarga los operadores del cliente con `GET /clientes/:id/operadores` y guarda la lista final con `PATCH /clientes/:id/operadores`.

---

## Por qué existe este spec

Los operadores de un cliente solo se eligen al crearlo (`usuario_ids` en `POST /clientes`). Después no hay forma de agregar ni quitar uno desde la app. El SPEC 42 del backend agregó dos rutas:

- `GET /clientes/:id/operadores` devuelve los operadores vinculados al cliente.
- `PATCH /clientes/:id/operadores` reemplaza el conjunto completo por la lista enviada.

En `ClientRowActions` ya existe el ítem **Editar Operadores Vinculados**, pero solo cambia `selectedAction` y no monta nada. Tampoco tiene permiso, así que hoy lo ve cualquier usuario. El backend deja usar las dos rutas a cualquier usuario autenticado, así que **quién ve el ítem lo decide el front**, con un permiso nuevo `EDITAR-OPERADORES-CLIENTE`.

---

## Alcance

**Entra:**

- Componente nuevo `EditOperadoresClienteDialog` (`presentation/components/inspeccion-clientes/`), sobre `CustomDialog`, con la misma forma que `EditClienteDialog`.
- Un solo campo: el `ControlledMultiSelector` de la creación, con el catálogo de `GET /catalogos/operadores` como opciones y los operadores vinculados preseleccionados.
- La descripción del diálogo avisa que los operadores que se quiten dejan de ver el cliente.
- El botón **Guardar cambios** queda deshabilitado si el conjunto elegido es igual al precargado, si está vacío o mientras se guarda. El orden de la selección no cuenta como cambio.
- Hook nuevo `useGetOperadoresCliente` (`presentation/hooks/clientes/`) sobre `useExecuteQuery`.
- Hook nuevo `useEditarOperadoresCliente` (`presentation/hooks/clientes/`) sobre `useExecuteMutation` con `PATCH`. Al guardar con éxito muestra un toast verde e invalida `['clientes']`.
- Schema nuevo `editarOperadoresClienteSchema`.
- Tipos nuevos `OperadoresClienteResponse` y `EditarOperadoresClienteBody` en `clientes.types.ts`.
- Permiso nuevo `EDITAR-OPERADORES-CLIENTE` en `PERMISSIONS`. El ítem del menú se esconde con `<Can>`.
- SQL para sembrar `EDITAR-OPERADORES-CLIENTE` en el backend, para los roles `ADMIN` y `SUPERVISOR`.
- Manual de usuario: sección nueva, fila en la tabla del administrador, fila en el anexo A y línea en **Sin publicar**.

**Fuera de alcance (para futuros specs):**

- Mostrar o conservar vínculos con usuarios inactivos o con otro rol. El backend no los devuelve en el `GET`, así que el front no puede verlos.
- Una confirmación aparte al quitar operadores.
- Una lista de solo lectura con los operadores vinculados, además del selector.
- Dejar un cliente sin operadores. El backend no lo permite.
- Editar los operadores desde `/clientes`, la grilla de tarjetas para pesar.
- Ver desde un usuario qué clientes tiene vinculados.
- Cambiar el ícono o el texto del ítem del menú.
- Limpiar los permisos escritos como texto en `_portal.inspeccion-clientes.tsx`.

---

## Modelo de datos

### El contrato del backend

`GET /clientes/:id/operadores` (SPEC 42 del backend):

| Respuesta | Cuándo | Qué hace el front |
| --- | --- | --- |
| 200 `{ ok, msg, operadores: [{ id, nombre }] }` | Siempre que el cliente existe y está activo | Preselecciona esos ids. |
| 400 `El cliente con id 'X' no existe` / `ya fue rechazado` | Otro usuario lo rechazó mientras tanto | El `ErrorBoundary` del diálogo pinta el error con **Cerrar** y **Reintentar**. |

- Solo devuelve usuarios activos con rol `OPERADOR`, el mismo filtro que `GET /catalogos/operadores`. Por eso todo id preseleccionado está entre las opciones del selector.

`PATCH /clientes/:id/operadores` con `{ usuario_ids }`:

| Respuesta | Cuándo | Qué hace el front |
| --- | --- | --- |
| 200 `{ ok, msg: 'Operadores del cliente actualizados correctamente' }` | Se guardó | Toast verde con el `msg`, invalida `['clientes']` y cierra el diálogo. |
| 400 `Debe vincular al menos un usuario` | Lista vacía | No pasa: el botón está deshabilitado con la lista vacía. |
| 400 `No se permiten usuarios repetidos` | Ids repetidos | No pasa: el selector no repite valores. |
| 400 `El usuario con id 'X' no existe` | Usuario borrado mientras tanto | Toast rojo automático, el diálogo sigue abierto. |
| 400 `El cliente con id 'X' ya fue rechazado` / `no existe` | Otro usuario lo rechazó mientras tanto | Toast rojo automático, el diálogo sigue abierto. |

- La lista **reemplaza** todos los vínculos: el backend borra lo que no viene. Un vínculo que el `GET` no mostró (un usuario inactivo o con otro rol) también se borra al guardar. Ver Riesgos.
- El backend no valida `cliente_operador` ni el rol. El permiso del front es lo único que esconde el ítem.

### Tipos (`src/presentation/types/clientes/clientes.types.ts`)

```ts
/** SPEC 42 del backend. Mismo `{ id, nombre }` que los catálogos. */
export interface OperadoresClienteResponse {
    ok: boolean
    msg: string
    operadores: CatalogoData[]
}

/** SPEC 42 del backend. El conjunto final de operadores, nunca vacío. */
export interface EditarOperadoresClienteBody {
    usuario_ids: number[]
}
```

- `CatalogoData` se importa de `presentation/types/catalogos/catalogo_response`.

### Schema (`src/presentation/schema/editar-operadores-cliente/editarOperadoresClienteSchema.ts`)

```ts
export const editarOperadoresClienteSchema = z.object({
    usuario_ids: z
        .array(z.number().int().positive(), { error: 'Operadores requeridos' })
        .min(1, 'Debe vincular al menos un operador'),
})

export type EditarOperadoresClienteSchema = z.infer<typeof editarOperadoresClienteSchema>
```

- El mínimo repite la regla del backend. Con el botón deshabilitado sin selección no debería dispararse, pero frena el envío si se llegara a enviar el formulario con Enter.

### Hooks

```ts
// src/presentation/hooks/clientes/useGetOperadoresCliente.tsx
export function useGetOperadoresCliente({ clienteId }: { clienteId: number }) {
    const { data } = useExecuteQuery<OperadoresClienteResponse>(
        ['clientes', clienteId, 'operadores'],
        `/clientes/${clienteId}/operadores`,
    )
    return { operadoresVinculados: data.operadores }
}

// src/presentation/hooks/clientes/useEditarOperadoresCliente.tsx
// Sin onError: el toast rojo lo pone useExecuteMutation.
export function useEditarOperadoresCliente({ clienteId }: { clienteId: number }) {
    const queryClient = useQueryClient()
    return useExecuteMutation<{ ok: boolean, msg: string }, EditarOperadoresClienteBody>(
        `/clientes/${clienteId}/operadores`,
        {
            method: 'PATCH',
            onSuccess: (data) => {
                toast.success(data.msg)
                void queryClient.invalidateQueries({ queryKey: ['clientes'] })
            },
        },
    )
}
```

- La `queryKey` del `GET` empieza con `'clientes'`, así que invalidar `['clientes']` la refresca por prefijo, junto con la tabla y la cartera de `/clientes`.
- El `GET` no usa `CATALOG_QUERY_OPTIONS`: no es un catálogo y tiene que reflejar el último guardado.

### Valores iniciales y cambios

```ts
const idsIniciales = operadoresVinculados.map((o) => o.id)

const form = useForm<EditarOperadoresClienteSchema>({
    resolver: zodResolver(editarOperadoresClienteSchema),
    defaultValues: { usuario_ids: idsIniciales },
})

const seleccion = form.watch('usuario_ids')
const sinCambios = mismoConjunto(seleccion, idsIniciales)
```

- `mismoConjunto(a, b)` compara por contenido y no por orden: mismo largo y todos los de `a` están en `b`. Vive en el mismo archivo del diálogo. No se usa `isDirty`, porque react-hook-form compara arrays en orden, y quitar y volver a agregar un operador lo marcaría como cambio.
- El botón se deshabilita con `sinCambios || seleccion.length === 0 || isPending`.
- El body es `{ usuario_ids: data.usuario_ids }`, tal cual sale del schema.

### Diálogo

- `title="Editar operadores vinculados"`, `description={`Los operadores que quite dejarán de ver a ${cliente.nombre} en su lista de clientes.`}`, `size="lg"`.
- Footer: **Cancelar** (`secondary`) y **Guardar cambios** (`form="form-editar-operadores-cliente"`, `type="submit"`). Mientras guarda, el botón dice **Guardando...**.
- El campo es el `ControlledMultiSelector` con `label="Operadores vinculados"`, `placeholder="Elegí uno o más operadores"`, `searchPlaceholder="Buscar operador..."` y `emptyMessage="Sin operadores"`, igual que `CreateClienteForm`.
- `EditOperadoresClienteDialog` recibe `cliente`, `open` y `onOpenChange`, igual que `EditClienteDialog`. Con `open` en `false` no pinta nada. Abierto, monta un `ErrorBoundary` y un `Suspense` alrededor de `EditOperadoresClienteForm`, el formulario interno, que llama a `useGetCatalogosOperadores` y a `useGetOperadoresCliente`. Así `useForm` toma los valores iniciales al montarse y, al cerrar, lo elegido se descarta sin `form.reset()`. Ninguna de las dos consultas sale hasta que alguien abre el diálogo.
- Los fallbacks son el mismo diálogo **Editar operadores vinculados**. Mientras carga, tiene el `LoadingState` adentro. Si falla, muestra "No se pudieron cargar los operadores del cliente." con **Cerrar** y **Reintentar**.
- Al guardar con éxito se cierra con un `useEffect` sobre `isSuccess`, como `EditClienteDialog`.

### Permiso

En `src/presentation/types/auth/permissions.ts`:

```ts
EDITAROPERADORESCLIENTE: 'EDITAR-OPERADORES-CLIENTE',
```

En `ClientRowActions`:

- El ítem **Editar Operadores Vinculados** gana `permission: PERMISSIONS.EDITAROPERADORESCLIENTE`. Su `run` ya existe.
- Se monta el diálogo con `open={selectedAction === 'EDITAR_OPERADORES_VINCULADOS_CLIENTE'}` y el mismo `onOpenChange` que los otros dos.

SQL a ejecutar a mano en el MySQL del backend, en cada entorno:

```sql
INSERT INTO catalogo_permisos (codigo, nombre, descripcion)
VALUES ('EDITAR-OPERADORES-CLIENTE', 'Editar operadores de un cliente', 'GET y PATCH /clientes/:id/operadores: cambiar los operadores vinculados a un cliente');

INSERT INTO permisos (rol_id, permiso_id)
SELECT r.id, c.id
FROM roles r
JOIN catalogo_permisos c ON c.codigo = 'EDITAR-OPERADORES-CLIENTE'
WHERE r.nombre IN ('ADMIN', 'SUPERVISOR');
```

- Los roles se resuelven por nombre, en mayúsculas, porque los ids cambian entre entornos.
- `GET /permisos/me` se lee una vez, al iniciar sesión. Un usuario con la sesión abierta no ve el ítem hasta que cierre sesión y vuelva a entrar.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/types/clientes/clientes.types.ts` | Tipos `OperadoresClienteResponse` y `EditarOperadoresClienteBody`. |
| `src/presentation/types/auth/permissions.ts` | `EDITAROPERADORESCLIENTE: 'EDITAR-OPERADORES-CLIENTE'`. |
| `src/presentation/schema/editar-operadores-cliente/editarOperadoresClienteSchema.ts` | Nuevo schema y su tipo. |
| `src/presentation/hooks/clientes/useGetOperadoresCliente.tsx` | Nuevo. |
| `src/presentation/hooks/clientes/useEditarOperadoresCliente.tsx` | Nuevo. |
| `src/presentation/components/inspeccion-clientes/EditOperadoresClienteDialog.tsx` | Nuevo. |
| `src/presentation/components/inspeccion-clientes/ClientRowActions.tsx` | Permiso en el ítem y montaje del diálogo. |
| `docs/manual/MANUAL.md` | Sección 5.7, índice, fila en la tabla del administrador, fila en el anexo A y línea en **Sin publicar**. |

---

## Plan de implementación

1. **Sembrar el permiso.** Ejecutar el SQL en el MySQL del backend. Verificación: `GET /permisos/me` con un `ADMIN` y con un `SUPERVISOR` incluye `EDITAR-OPERADORES-CLIENTE`; con un `OPERADOR`, no.
2. **Tipos y permiso.** Agregar `OperadoresClienteResponse`, `EditarOperadoresClienteBody` y `EDITAROPERADORESCLIENTE`. Todavía nadie los usa. Verificación: `npx tsc --noEmit` sin errores, y el aviso de `advertirPermisosDesconocidos` desaparece en desarrollo.
3. **Schema.** Crear `editarOperadoresClienteSchema`. Verificación: `npx tsc --noEmit` sin errores.
4. **Hooks.** Crear `useGetOperadoresCliente` y `useEditarOperadoresCliente`. Todavía nadie los llama.
5. **Diálogo.** Crear `EditOperadoresClienteDialog` con el formulario, los valores iniciales, `mismoConjunto` y el botón deshabilitado sin cambios o sin selección. Todavía nadie lo monta.
6. **Conectar el menú.** En `ClientRowActions`, el ítem **Editar Operadores Vinculados** usa `PERMISSIONS.EDITAROPERADORESCLIENTE` y se monta el diálogo. Prueba manual: quitar un operador y agregar otro, guardar, y comprobar que el operador quitado ya no ve el cliente en `/clientes` y el agregado sí.
7. **Manual.** En `docs/manual/MANUAL.md`:
   - Sección nueva **5.7 Cambiar los operadores de un cliente** en el capítulo del supervisor, con ancla `cap-5-7`. Pasos: **Clientes** → **⋯** → **Editar Operadores Vinculados** → marcar o desmarcar operadores → **Guardar cambios**. Debe decir que un operador que se quita deja de ver el cliente en su lista, y que el cliente tiene que quedar con al menos un operador.
   - En el índice, la entrada de la 5.7.
   - En la tabla del capítulo del administrador, la fila "Cambiar los operadores de un cliente | 5.7".
   - En el anexo A, la fila con **Sí** para supervisor y administrador.
   - Una línea en **Sin publicar**.
   - Si hace falta una captura nueva, su fila en `docs/manual/README.md` como **Pendiente**.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run test` pasan.
- [ ] Con un `ADMIN` o un `SUPERVISOR`, el menú de cada fila de `/inspeccion-clientes` muestra **Editar Operadores Vinculados**.
- [ ] Con un `OPERADOR`, el ítem no aparece.
- [ ] **Editar Operadores Vinculados** abre el diálogo **Editar operadores vinculados** con la descripción que nombra al cliente.
- [ ] El selector tiene como opciones los operadores de `GET /catalogos/operadores` y arranca con los de `GET /clientes/:id/operadores` marcados.
- [ ] Ninguna de las dos peticiones sale hasta que se abre el diálogo.
- [ ] Sin tocar nada, **Guardar cambios** está deshabilitado.
- [ ] Desmarcar un operador y volver a marcarlo deja **Guardar cambios** deshabilitado.
- [ ] Con ningún operador marcado, **Guardar cambios** está deshabilitado.
- [ ] Al quitar un operador y agregar otro, la petición es `PATCH /clientes/:id/operadores` con body `{ "usuario_ids": [...] }` y la lista completa elegida.
- [ ] Al guardar con éxito, aparece el toast "Operadores del cliente actualizados correctamente" y el diálogo se cierra.
- [ ] Al volver a abrir el diálogo después de guardar, aparecen marcados los operadores nuevos, sin recargar la página.
- [ ] El operador quitado ya no ve el cliente en `/clientes` y el agregado sí, después de volver a entrar o recargar.
- [ ] Cerrar el diálogo sin guardar y volver a abrirlo muestra los operadores vinculados, no lo que se había marcado.
- [ ] Un 400 del backend al guardar (por ejemplo, el cliente fue rechazado mientras tanto) muestra un toast rojo con el mensaje del backend y deja el diálogo abierto.
- [ ] Si `GET /clientes/:id/operadores` falla al abrir, el diálogo muestra "No se pudieron cargar los operadores del cliente." con **Cerrar** y **Reintentar**.
- [ ] El manual tiene la sección 5.7, su entrada en el índice, la fila en la tabla del administrador, la fila en el anexo A y su línea en **Sin publicar**.

---

## Decisiones

- **Sí:** el diálogo se abre desde el ítem **Editar Operadores Vinculados** que ya existe en `ClientRowActions`.
- **Sí:** permiso nuevo `EDITAR-OPERADORES-CLIENTE`. Decisión del usuario. Separa quién edita los datos del cliente de quién reparte la cartera de los operadores.
- **No:** reusar `EDITAR-CLIENTE`. Se recomendó porque no pedía SQL nuevo, y se descartó.
- **No:** dejar el ítem sin permiso. Hoy lo ve cualquier usuario, `OPERADOR` incluido, y con eso un operador podría repartirse clientes.
- **Sí:** el permiso es para `ADMIN` y `SUPERVISOR`. Decisión del usuario. Son los mismos roles de `EDITAR-CLIENTE`.
- **Sí:** **Guardar cambios** se habilita solo si el conjunto cambió y no está vacío. Decisión del usuario. Es la misma regla de **Editar cliente**.
- **Sí:** el cambio se compara como conjunto con `mismoConjunto`, no con `isDirty`. `isDirty` compara el array en orden.
- **Sí:** el aviso es un texto fijo en la descripción del diálogo. Decisión del usuario.
- **No:** un segundo diálogo para confirmar a quiénes se quita. Un paso más para un cambio que se deshace volviendo a marcar.
- **Sí:** el diálogo solo tiene el selector múltiple. Decisión del usuario. Es el mismo componente de la creación.
- **No:** una lista de solo lectura de los vinculados. El selector ya los muestra marcados.
- **Sí:** las opciones salen de `GET /catalogos/operadores`. Tiene el mismo filtro que el `GET` de los vinculados, así que todo vinculado aparece como opción.
- **Sí:** el formulario se monta solo con el diálogo abierto, con `ErrorBoundary` y `Suspense` adentro del diálogo. Es la estructura de `EditClienteDialog`.
- **Sí:** el `GET` de los vinculados usa la `queryKey` `['clientes', clienteId, 'operadores']`. Así lo refresca la misma invalidación de `['clientes']` que ya hacen el rechazo y la edición.
- **Sí:** el hook no declara `onError`. Es la regla de `CLAUDE.md`.
- **Sí:** nombres `EditOperadoresClienteDialog`, `useGetOperadoresCliente` y `useEditarOperadoresCliente`, contra la regla de identificadores nuevos en inglés. Decisión del usuario, con el mismo criterio de los SPEC 18 y 19: la carpeta ya tiene `EditClienteDialog` y `useEditarCliente`.
- **Sí:** el manual pone la sección en el capítulo del supervisor, como la 5.6, y el administrador la referencia desde su tabla.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 42 del backend | Las dos rutas responden 404. Al abrir, el diálogo muestra el error con **Reintentar**. Este spec se mergea después del backend. |
| No se sembró `EDITAR-OPERADORES-CLIENTE` en un entorno | Nadie ve el ítem. Falla cerrado. El paso 1 se repite en cada entorno. |
| El permiso es solo visual: cualquiera con un token puede llamar a `PATCH /clientes/:id/operadores` directo | Riesgo aceptado en el SPEC 42 del backend. |
| Un vínculo a un usuario inactivo o con otro rol no aparece en el selector y se borra al guardar | Riesgo aceptado en el SPEC 42 del backend. El front no puede verlo: el `GET` no lo devuelve. |
| El catálogo de operadores está en caché 10 minutos y no trae a un operador recién creado | Ese operador no aparece como opción hasta que la caché vence o se recarga la página. Es el mismo comportamiento de la creación. |
| Un operador con la sesión abierta sigue viendo el cliente quitado en `/clientes` | Su pantalla tiene la lista en caché. Lo deja de ver al recargar. El backend ya le responde 403 si intenta crear un lote o un pesaje para ese cliente. |
| Un usuario con la sesión abierta cuando se siembra el permiso no ve el ítem | Lo verá al volver a iniciar sesión, porque los permisos se leen al hacer login. |

---

## Lo que **no** entra en este spec

- Mostrar o conservar vínculos con usuarios inactivos o con otro rol.
- Confirmación aparte al quitar operadores, o una lista de solo lectura.
- Dejar un cliente sin operadores.
- Editar los operadores desde `/clientes`.
- Ver desde un usuario sus clientes vinculados.
- Cambiar el ícono o el texto del ítem.
- Limpiar los permisos escritos como texto en `_portal.inspeccion-clientes.tsx`.

Cada uno de estos, si se necesita, va en su propio spec.
