# SPEC 09 — Endpoint `/clientes/all` en Inspección de clientes

> **Estado:** Implemented
> **Depende de:** SPEC 08
> **Fecha:** 2026-08-29
> **Objetivo:** Reemplazar el array en duro de `useClientInspection` por un `useExecuteQuery` contra `GET /clientes/all`, sin tocar la vista ni la ruta.

---

## Por qué existe este spec

SPEC 08 dejó `/inspeccion-clientes` armada de punta a punta —ruta, `ClientInspectionView`, columnas, `DataTable`— con el hook devolviendo un `Cliente` de mentira en un `const`. Ese spec anotó explícitamente que conectar el endpoint era otro spec y que iba a tocar **sólo** el interior de `useClientInspection`. Este es ese spec, y sigue siendo eso: un archivo.

---

## Alcance

**Dentro:**

- `src/presentation/hooks/inspeccion-clientes/useClientInspection.tsx`: se borra la constante `SIN_CLIENTES` y el hook pasa a llamar a `useExecuteQuery<ClientesResponse>(['clientes', 'all'], '/clientes/all')`.
- El hook sigue devolviendo `{ clientes }`, con la misma forma que hoy.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio en `ClientInspectionView.tsx`: las columnas, el `defaultSorting`, el `maxHeight` y los textos del estado vacío quedan como están.
- Cualquier cambio en `_portal.inspeccion-clientes.tsx`: el `<Suspense>` y el `ClientesHeader` quedan como están.
- Agregar un `<ErrorBoundary>` propio a la ruta. Ya hay uno en el layout (ver Decisiones).
- Filtros, búsqueda o paginación sobre `/clientes/all`.
- Tocar `useClientes` (`/clientes`) o la pantalla `/clientes`.
- Unificar los dos endpoints de clientes en un solo hook.
- Aplicar permisos (`<Can>`, guard de ruta) a esta pantalla.
- Tests del hook.

---

## Modelo de datos

Este spec **no** introduce tipos nuevos. Reusa los que ya existen en `src/presentation/types/clientes/clientes.types.ts`:

```ts
export interface Cliente {
    id: number
    nombre: string
    producto: string | null
    codigo_exportacion: string | null
    telefono: string | null
    direccion_planta: string | null
}

export interface ClientesResponse {
    ok: boolean
    msg: string
    clientes: Cliente[]
}
```

`GET /clientes/all` devuelve el mismo sobre que `GET /clientes`: `{ ok, msg, clientes }`. Por eso se tipa con `ClientesResponse` y el hook expone `data.clientes`.

**`queryKey`: `['clientes', 'all']`.** No comparte caché con `useClientes`, que usa `['clientes']`. Son dos endpoints distintos y el mismo key guardaría dos respuestas bajo una sola entrada.

---

## Plan de implementación

Un solo paso, porque es un solo archivo.

1. **Reescribir `useClientInspection.tsx`.** Borrar `SIN_CLIENTES`. Importar `useExecuteQuery` de `#/presentation/hooks/shared/useExecuteQuery` y `ClientesResponse` de `#/presentation/types/clientes/clientes.types`. El cuerpo queda en dos líneas: la query y el `return { clientes: data.clientes }`.

   ```ts
   export function useClientInspection() {
       const { data } = useExecuteQuery<ClientesResponse>(['clientes', 'all'], '/clientes/all')

       return { clientes: data.clientes }
   }
   ```

   Verificación: `npx tsc --noEmit` pasa y `npm run dev` muestra la tabla con los clientes del backend.

2. **Verificación final:** `npx tsc --noEmit` y `npx vitest run` completos, más el recorrido manual de los criterios de aceptación.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` pasa sin errores.
- [X] `npx vitest run` pasa completo, sin tests nuevos ni tests rotos.
- [X] `useClientInspection.tsx` no contiene ningún dato de cliente en duro.
- [X] Con el backend arriba, `/inspeccion-clientes` pinta una fila por cliente devuelto por `GET /clientes/all`.
- [X] Mientras la petición está en vuelo, se ve el `LoadingState` con "Cargando clientes..." que ya monta la ruta.
- [X] Si la petición falla, la pantalla muestra el fallback del `ErrorBoundary` del layout ("No se pudo cargar la información") con su botón de reintento, y el reintento vuelve a pedir.
- [X] Si el backend devuelve `clientes: []`, se ve el estado vacío del `DataTable` con "No hay clientes para inspeccionar".
- [X] Las columnas nulas (`producto`, `codigo_exportacion`, `telefono`, `direccion_planta` en `null`) siguen pintando el guión largo del componente `Dato`.
- [X] `ClientInspectionView.tsx` y `_portal.inspeccion-clientes.tsx` quedan sin cambios respecto de SPEC 08.
- [X] `/clientes` sigue funcionando igual: `useClientes` no se toca y su caché `['clientes']` no se pisa.

---

## Decisiones

- **Sí:** `useExecuteQuery`, no un `fetch` propio ni `useQuery` a mano. Decisión del usuario, y es la regla de `CLAUDE.md`: todos los GET pasan por el hook genérico, que ya trae el token, el refresh del 401, los reintentos y la suspensión.
- **Sí:** tipar con `ClientesResponse`. Decisión del usuario: `/clientes/all` devuelve el mismo sobre `{ ok, msg, clientes }` que `/clientes`, así que no hace falta un tipo nuevo.
- **No:** tipar la respuesta como `Cliente[]` pelado. Fue la alternativa considerada y el usuario confirmó que el backend manda el sobre.
- **Sí:** `queryKey` `['clientes', 'all']`. Decisión del usuario. Deja la caché de esta pantalla separada de la de `useClientes`.
- **No:** reusar `['clientes']`. Comparte caché entre dos endpoints distintos; el día que las respuestas difieran, la misma entrada guarda dos formas.
- **No:** un `<ErrorBoundary>` nuevo en `_portal.inspeccion-clientes.tsx`. Se planteó agregarlo y el usuario lo aprobó, pero al verificar resultó innecesario: `(portal)/_portal.tsx` ya envuelve el `<Outlet/>` en el `ErrorBoundary` de `shared/`, con `useQueryErrorResetBoundary` y `key={pathname}` para limpiarse al cambiar de ruta. Todas las rutas del portal quedan cubiertas. Agregar otro adentro sería un segundo fallback para el mismo error.
- **No:** unificar `useClientes` y `useClientInspection`. Son dos endpoints, dos pantallas y dos propósitos: uno elige un cliente para pesar, el otro lista para inspeccionar. Unificarlos es un spec propio, si algún día hace falta.
- **No:** tests del hook. Un `useExecuteQuery` de una línea no tiene lógica que probar; lo que valdría la pena testear (el cliente HTTP) tiene sus propios specs pendientes.

---

## Lo que **no** entra en este spec

- Cambios en `ClientInspectionView.tsx` o en la ruta.
- Un `<ErrorBoundary>` propio de la ruta.
- Filtros, búsqueda o paginación de clientes.
- Cambios en `useClientes` o en la pantalla `/clientes`.
- Permisos aplicados a `/inspeccion-clientes`.
- Migrar `PesajesTable` al `DataTable`.

Cada uno de ellos, si se hace, va en su propio spec.
