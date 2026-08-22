# SPEC 04 — Selección de cliente antes del pesaje

> **Estado:** Implemented
> **Depende de:** SPEC 02
> **Fecha:** 2026-08-22
> **Objetivo:** Convertir `/clientes` en la pantalla de entrada del flujo de pesaje, con una lista de tarjetas de los clientes del operador que al elegir una lleva a `/control-calidad` con ese cliente, de modo que nadie pese sin saber para quién.

---

## Por qué existe este spec

Hoy el flujo entra directo al pesaje y el cliente es una constante:

- `useControlCalidad.tsx:10` fija `operacion = { cliente: 'Azucarera La Grecia', etapa: 'En Proceso', lote: 'S-88' }` en un `useState`. La pantalla siempre pesa para el mismo cliente inventado.
- `HeaderControlCalidad.tsx:75` pinta un botón con una flecha hacia atrás que **no tiene `onClick`**. Es un botón muerto: sugiere que hay una pantalla anterior y no la hay.
- `_portal.clientes.tsx:8` existe y devuelve `<div>Hello "/(portal)/(clientes)/_portal/clientes"!</div>`. La ruta está reservada y vacía.
- El Sidebar (`SideBar.tsx:33`) manda "Control de Calidad" directo a `/control-calidad`, saltándose el paso que este spec crea.

Este spec conecta esas cuatro puntas: la flecha deja de ser decorativa, `/clientes` deja de ser un placeholder, el Sidebar entra por el principio del flujo y `operacion.cliente` deja de ser una constante.

---

## Contrato de datos

El endpoint de clientes **existe en el backend pero no se consume en este spec** (decisión explícita). Lo que sí se fija acá es la forma del dato, tomada de la tabla real, para que el mock de hoy y la respuesta de mañana sean el mismo tipo.

Tipo de la tabla, en Kysely:

```ts
export interface ClientesTable {
  id: Generated<number>
  nombre: string
  rtn: string
  producto_id: number | null
  codigo_exportacion: string | null
  correo_contacto: string | null
  telefono: string | null
  direccion_planta: string | null
  ubicacionLongitud: string | null
  ubicacionLatitude: string | null
  isActive: Generated<number | null>
  created_by: number | null
  created_at: Generated<Date | string | null>
  updated_at: Generated<Date | string | null>
}
```

`Generated<T>` es un envoltorio de Kysely que solo existe del lado del servidor: marca las columnas que la base rellena sola. En el front se desenvuelve a `T`.

Lo que este spec **no** define, y hay que cerrar cuando se conecte el endpoint: la URL, y si el filtro "clientes de este operador" sale del token o de un parámetro con el `id` del usuario. La tabla tiene `created_by`, que es el candidato obvio, pero no está confirmado.

---

## Alcance

**Dentro:**

- Tipo `Cliente` en `src/presentation/types/clientes/clientes.types.ts`, espejo del wire format.
- Hook `useClientes` con **3 clientes mock** en `useState` y la acción de seleccionar.
- Vista `ClientesView` con el grid de tarjetas, y componente `ClienteCard`.
- `/clientes` deja de ser un placeholder y monta la vista.
- Al elegir una tarjeta, navegación a `/control-calidad` con el objeto `Cliente` completo en el `state` del router.
- Augmentación de `HistoryState` de TanStack Router para tipar ese `state`.
- Guard en `/control-calidad`: sin cliente en el `state`, redirección a `/clientes`.
- La flecha de `HeaderControlCalidad` navega a `/clientes`.
- El item "Control de Calidad" del Sidebar apunta a `/clientes` y queda activo también en `/control-calidad`.
- `useControlCalidad` recibe el cliente y llena `operacion.cliente` con su `nombre`.
- `operacion.etapa` y `operacion.lote` pasan a cadena vacía, y `DetallesOperacionCard` pinta `—` cuando están vacíos.

**Fuera de alcance (para specs futuros):**

- **Consumir el endpoint real de clientes.** Existe, pero acá se queda en mock. Cuando se conecte, se reemplaza solo el interior de `useClientes`.
- Definir la URL del endpoint y cómo filtra por operador.
- Pantalla de selección de lote o de SKU. Es la que va a llenar `etapa` y `lote`.
- Buscador, filtro por estado o paginación en la lista de clientes. Con 3 tarjetas no hace falta.
- Alta, edición o baja de clientes.
- Mostrar teléfono, correo, coordenadas o código de exportación en algún detalle del cliente.
- Persistir el último cliente elegido entre sesiones.
- Cruzar el cliente elegido con los parámetros de `useParametros`: el rango min/ideal/max sigue siendo el mock de `useControlCalidad`.
- Unificar `Cliente` con el `ClienteParametro` de la pantalla de Parámetros.
- `/crear-pesaje`, que sigue siendo un placeholder.

---

## Modelo de datos

### Tipo nuevo — `src/presentation/types/clientes/clientes.types.ts`

Espeja el wire format: mismos nombres que la tabla, `snake_case` incluido, y sin capa de traducción. Misma decisión que el SPEC 02 con `complete_name`.

```ts
export interface Cliente {
    id: number
    nombre: string
    rtn: string
    producto_id: number | null
    codigo_exportacion: string | null
    correo_contacto: string | null
    telefono: string | null
    direccion_planta: string | null
    ubicacionLongitud: string | null
    ubicacionLatitude: string | null
    isActive: number | null
    created_by: number | null
    created_at: string | null
    updated_at: string | null
}
```

Tres diferencias con `ClientesTable`, todas deliberadas:

- `Generated<T>` desaparece: es de Kysely, no viaja por HTTP.
- `created_at` / `updated_at` son `string | null` y no `Date`. Un JSON no transporta `Date`, y el objeto viaja por el `state` del router, que se serializa.
- `isActive` sigue siendo `number | null` (el `tinyint` 0/1 crudo), no `boolean`. Convertirlo obligaría a una función de mapeo para un solo campo.

`ubicacionLongitud` y `ubicacionLatitude` conservan su mezcla de idiomas y su `Latitude` sin la `d` final, tal como están en la tabla. No es un error de transcripción: renombrarlos en el front crearía una diferencia con el backend que hay que recordar para siempre.

### Estado de navegación

El cliente elegido viaja en el `state` del historial, no en la URL. Se tipa augmentando la interfaz del router en el mismo archivo:

```ts
declare module '@tanstack/react-router' {
    interface HistoryState {
        cliente?: Cliente
    }
}
```

`cliente` es opcional: toda entrada directa a `/control-calidad` llega sin él, y ese es justamente el caso que dispara el guard.

### Mock — dentro de `useClientes.tsx`

Tres clientes, con la misma forma exacta del tipo. `direccion_planta` es lo que pinta la tarjeta como subtítulo, así que los tres la traen; uno de ellos deja campos opcionales en `null` para que la pantalla se pruebe contra datos incompletos desde el primer día.

```ts
const CLIENTES_INICIALES: Cliente[] = [
    { id: 1, nombre: 'Agrolibano', rtn: '08019995123456',
      direccion_planta: 'Km 12 Carretera al Sur, Choluteca', isActive: 1, /* … */ },
    { id: 2, nombre: 'Tropical Fruit Co', rtn: '05019004556677',
      direccion_planta: 'Zona Industrial El Progreso, Yoro', isActive: 1, /* … */ },
    { id: 3, nombre: 'Azucarera La Grecia', rtn: '06011998223344',
      direccion_planta: null, isActive: 0, /* … */ },
]
```

### Cambio en `OperacionData`

El tipo no cambia de forma: `cliente`, `etapa` y `lote` siguen siendo `string`. Lo que cambia es que `etapa` y `lote` pasan a valer `''`, y la cadena vacía significa "todavía no hay pantalla que lo elija".

---

## Plan de implementación

1. **Crear `src/presentation/types/clientes/clientes.types.ts`** con la interfaz `Cliente` y la augmentación de `HistoryState`. Verificación: `npx tsc --noEmit` pasa.

2. **Crear `src/presentation/hooks/clientes/useClientes.tsx`.** Devuelve `{ clientes, seleccionarCliente }`:
   - `clientes: Cliente[]` — los 3 mock en `useState`, igual que `useParametros`.
   - `seleccionarCliente(cliente: Cliente)` — `navigate({ to: '/control-calidad', state: { cliente } })`.
   Toda la lógica de la pantalla vive acá; la ruta y la vista solo pintan. Verificación: `npx tsc --noEmit` pasa.

3. **Crear `src/presentation/components/clientes/ClienteCard.tsx`.** Presentacional puro: recibe `cliente` y `onSeleccionar`. Es un `<button>` de ancho completo, no un `div` con `onClick`, para que funcione con teclado. Contenido:
   - Cuadro de ícono a la izquierda, `bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl`, con el mismo SVG de edificio que ya usa `DetallesOperacionCard.tsx:12`. Fijo para todos los clientes.
   - `nombre` en `text-text-main font-extrabold`.
   - `direccion_planta` debajo, en `text-text-muted text-[11px]`, truncada a una línea. Si es `null`, se pinta `Sin dirección registrada`.
   - Badge de estado abajo, derivado de `isActive`: `1` → "ACTIVO" en verde esmeralda; cualquier otro valor, `0` y `null` incluidos → "INACTIVO" en gris. Mismo lenguaje de pills que `HeaderControlCalidad.tsx:92`.
   - Card con `bg-surface`, `rounded-[28px]`, `border border-border-ui/50`, `shadow-clay-card`, y estado `hover` elevado.
   Verificación: `npx tsc --noEmit` pasa.

4. **Crear `src/presentation/views/clientes/ClientesView.tsx`.** Recibe `clientes` y `onSeleccionar`, y pinta el encabezado ("Seleccioná un cliente" más una línea de apoyo) y el grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` mapeando `ClienteCard`. Si `clientes` viene vacío, un bloque de estado vacío en vez de un grid en blanco. Verificación: `npx tsc --noEmit` pasa.

5. **Reemplazar `src/routes/(portal)/_portal.clientes.tsx`.** Se borra el `<div>Hello …`; queda `createFileRoute` + `useClientes()` + `<ClientesView />`. Verificación manual: `/clientes` muestra las 3 tarjetas en claro y en oscuro.

6. **Modificar `src/presentation/hooks/bascula/useControlCalidad.tsx`** para que acepte `cliente: Cliente | null` como parámetro y arme `operacion` con `cliente: cliente?.nombre ?? ''`, `etapa: ''` y `lote: ''`. El `useState` de la operación pasa a derivarse del parámetro. Nada más del hook cambia: la báscula, el bloqueo crítico y el historial de muestras quedan intactos. Verificación: `npx tsc --noEmit` pasa y `npx vitest run` sigue en verde.

7. **Modificar `src/presentation/views/control-calidad/DetallesOperacionCard.tsx`** para pintar `—` cuando `etapa` o `lote` estén vacíos, en `text-text-muted` en vez del `font-extrabold` del valor real. El punto indigo de la etapa solo se pinta si hay etapa. Verificación manual: la card no muestra huecos.

8. **Modificar `src/routes/(portal)/_portal.control-calidad.tsx`**: leer el cliente del `state`, pasarlo a `useControlCalidad(cliente)` y montar el guard. Dos capas, por el mismo motivo documentado en `_portal.tsx:27-30`:
   - `beforeLoad: ({ location }) => { if (!location.state.cliente) throw redirect({ to: '/clientes' }) }`, que cubre la entrada directa por URL.
   - Un `useEffect` de respaldo en el componente que navega a `/clientes` si no hay cliente, porque en una carga con SSR ya renderizado `beforeLoad` no se repite al hidratar.
   Verificación manual: entrar a `/control-calidad` escribiendo la URL rebota a `/clientes`.

9. **Modificar `src/presentation/components/control-calidad/HeaderControlCalidad.tsx`**: la flecha recibe `onVolver: () => void` por props y lo cablea a su `onClick`. La ruta le pasa la navegación a `/clientes`. Se le agrega `aria-label="Volver a clientes"` y `type="button"`. Verificación manual: la flecha lleva a la lista.

10. **Modificar `src/presentation/components/shared/SideBar.tsx`**: el item "Control de Calidad" cambia `to: '/control-calidad'` por `to: '/clientes'`, y se le agrega `activeOptions` o una comprobación de la ruta actual para que quede resaltado también en `/control-calidad`. La etiqueta no cambia. Verificación manual: el item está resaltado en las dos pantallas.


---

## Criterios de aceptación

- [X] `npx tsc --noEmit` pasa sin errores.
- [X] `npx vitest run` pasa completo, con los mismos tests que hoy.
- [X] El item "Control de Calidad" del Sidebar lleva a `/clientes`.
- [X] `/clientes` muestra 3 tarjetas, cada una con ícono, nombre, dirección de planta y badge de estado.
- [X] La tarjeta cuyo `direccion_planta` es `null` muestra "Sin dirección registrada" y no un hueco ni "null".
- [X] La tarjeta cuyo `isActive` es `0` muestra el badge "INACTIVO"; las de `isActive: 1` muestran "ACTIVO".
- [X] Hacer click en una tarjeta lleva a `/control-calidad`.
- [X] Tras elegir "Agrolibano", `DetallesOperacionCard` muestra "Agrolibano" en el renglón Cliente.
- [X] Los renglones Etapa y Lote muestran `—`, sin el punto indigo en Etapa.
- [X] Las tarjetas se recorren con Tab y se activan con Enter y con Espacio.
- [X] Escribir `/control-calidad` directo en la barra de direcciones redirige a `/clientes`.
- [X] Recargar con F5 estando en `/control-calidad` termina en `/clientes`, sin pantalla rota ni cliente vacío.
- [X] La flecha de la esquina superior izquierda de `/control-calidad` lleva a `/clientes`.
- [X] El item del Sidebar queda resaltado tanto en `/clientes` como en `/control-calidad`.
- [X] La báscula sigue funcionando igual: conectar, estabilizar, bloqueo crítico e historial de muestras no cambian.
- [X] `/clientes` se ve correcta en modo claro y oscuro, y a 360 px de ancho.

---

## Decisiones

- **Sí:** los clientes salen de un mock en `useClientes`, aunque el endpoint ya exista en el backend. Decisión explícita del usuario: este spec cierra la pantalla y el flujo, y conectar el endpoint va en su propio spec. Es la convención que ya dice `CLAUDE.md` para `useControlCalidad` y `useParametros`: al conectar, se reemplaza solo el interior del hook.
- **Sí:** el tipo `Cliente` se define ahora aunque los datos sean mock. Es lo que hace que conectar el endpoint después sea cambiar el interior de un hook y no reescribir la pantalla.
- **Sí:** tipo nuevo en `types/clientes/`, sin reusar `ClienteParametro` de `types/parametros/`. Ese tipo modela otra cosa —los parámetros de peso por SKU— y no tiene ninguno de los campos de la tabla real. Unificarlos, si alguna vez tiene sentido, va en otro spec.
- **Sí:** el tipo espeja el wire format, `snake_case` y `isActive` numérico incluidos. Sin capa de mapeo que mantener. Misma decisión y mismo motivo que el SPEC 02 con `complete_name`.
- **Sí:** `ubicacionLongitud` y `ubicacionLatitude` se copian con su mezcla de idiomas y su `Latitude` incompleto. Corregirlo en el front crea una discrepancia permanente con el backend.
- **Sí:** el objeto `Cliente` completo viaja por el `state` del router. Elección del usuario sobre pasar solo el `id` en un search param. Ventaja: cero búsquedas y cero peticiones en el destino, y la URL queda limpia. Costo asumido: la URL no es compartible y el cliente no sobrevive a una recarga, lo cual es aceptable **porque** el guard manda a `/clientes` en ese caso.
- **No:** `?clienteId=X` en la URL. Descartado por el usuario. Habría sobrevivido al F5 y sería compartible, a cambio de re-buscar el cliente en el destino.
- **Sí:** `HistoryState` augmentado. Sin eso, `location.state.cliente` es `any` y el guard se escribe a ciegas.
- **Sí:** guard en dos capas, `beforeLoad` más `useEffect`. No es cinturón y tirantes: `_portal.tsx:27-30` ya documenta que en una carga directa con SSR el `beforeLoad` no se repite al hidratar, y por eso ese layout tiene exactamente el mismo respaldo.
- **Sí:** entrar a `/control-calidad` sin cliente redirige en vez de mostrar la pantalla vacía. Pesar sin saber para quién es el problema que este spec vino a resolver.
- **Sí:** el Sidebar mantiene la etiqueta "Control de Calidad" apuntando a `/clientes`. El menú nombra la función, no la URL, y el operario entra por donde empieza el flujo.
- **Sí:** el item queda activo también en `/control-calidad`. Con el `activeProps` por defecto, el menú se apagaría entero justo en la pantalla donde más tiempo pasa el operario.
- **Sí:** la tarjeta muestra `direccion_planta` como subtítulo. Ubica físicamente al cliente, que es lo útil para quien pesa. Es `string | null`, así que la pantalla tiene que manejar el vacío, y por eso uno de los tres mock lo trae en `null`.
- **No:** `rtn` como subtítulo. Es `string` no nulo y nunca falta, pero un número fiscal de 14 dígitos no ayuda a nadie a elegir de un vistazo en planta.
- **Sí:** ícono fijo de edificio para todos. La tabla no tiene columna de ícono y las iniciales del nombre serían un dato derivado que no distingue mejor que el propio nombre.
- **Sí:** `etapa` y `lote` se vacían y la card pinta `—`. Ninguno de los dos está en `ClientesTable`. Dejarlos hardcodeados mostraría "S-88" para cualquier cliente, que es peor que un guion: parece un dato real.
- **No:** agregar `etapa` y `lote` al mock del cliente. Inventaría una relación cliente–lote que la base no define, y el día que el endpoint devuelva `ClientesTable` esos campos desaparecen.
- **Sí:** `ClienteCard` es un `<button>`, no un `div` con `onClick`. Sale gratis el foco, el Enter, el Espacio y el rol correcto para un lector de pantalla.
- **No:** buscador ni filtros en la lista. Con 3 tarjetas es ruido; cuando el endpoint devuelva decenas, se agrega con su propio spec.
- **No:** `Suspense` + `ErrorBoundary` en `/clientes`. El hook devuelve un `useState`, no un `useSuspenseQuery`. Cuando se conecte el endpoint habrá que envolverlo, y ese es trabajo del spec que lo conecte.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El `state` del historial no sobrevive de forma fiable a una recarga ni al render del servidor, así que `/control-calidad` puede quedar sin cliente en cualquier momento. | Es el caso que el guard cubre: sin cliente, a `/clientes`. El operario pierde el paso, no la sesión. Es el precio de haber elegido el `state` sobre el search param. |
| `beforeLoad` no se repite al hidratar una carga directa con SSR (`_portal.tsx:27-30`), así que el guard del servidor puede saltarse. | El `useEffect` de respaldo en el componente, copiando el patrón que ese mismo layout ya usa para el guard de sesión. |
| El mock de 3 clientes se queda en el código y alguien lo confunde con datos reales al conectar el endpoint. | El hook se llama igual y devuelve el mismo tipo: conectar es reemplazar el interior. Queda anotado en Alcance y en `CLAUDE.md`. |
| Cuando llegue el endpoint, el filtro "clientes de este operador" puede no existir y devolver todos los clientes. | Fuera de alcance acá, pero anotado: la tabla tiene `created_by` como candidato y hay que confirmarlo con el backend antes de escribir ese spec. |
| `isActive` es `number \| null`: un `null` no significa ni activo ni inactivo. | La tarjeta trata `1` como ACTIVO y todo lo demás como INACTIVO. Es la lectura conservadora: ante la duda, no se marca como activo. |
| `useControlCalidad` cambia de firma y es el hook más delicado del repo. | El cambio se limita a cómo se arma `operacion`. La báscula, el bloqueo crítico y el historial no se tocan, y hay un criterio de aceptación dedicado a que sigan funcionando. |
| El objeto `Cliente` completo viaja en el `state`, con correo, teléfono y coordenadas que la pantalla no usa. | El `state` del historial vive en memoria del navegador y no se manda a ningún lado. Si el objeto crece, conviene revisar si conviene volver al `id` en la URL. |
| `DetallesOperacionCard.tsx:9` tiene `animate-pulse` sobre toda la card, que parece un resto de esqueleto de carga. | Se deja como está: no es de este spec. Anotado por si al ver la card con guiones parece un estado de carga en vez de un dato vacío. |

---

## Lo que **no** entra en este spec

- Consumir el endpoint real de clientes, ni definir su URL o su filtro por operador.
- La pantalla de selección de lote o SKU, que es la que llenará `etapa` y `lote`.
- Buscador, filtros o paginación en la lista de clientes.
- Alta, edición o baja de clientes.
- Mostrar teléfono, correo, coordenadas o código de exportación en algún lado.
- Recordar el último cliente elegido entre sesiones.
- Cruzar el cliente con los parámetros de peso de `useParametros`.
- Unificar `Cliente` con `ClienteParametro`.
- `/crear-pesaje`, que sigue siendo un placeholder.

Cada uno de ellos, si se hace, va en su propio spec.
