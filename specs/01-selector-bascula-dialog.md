# SPEC 01 — Selector de báscula con dialog propio

> **Estado:** Borrador
> **Depende de:** —
> **Fecha:** 2026-08-21
> **Objetivo:** Reemplazar el diálogo nativo de Chrome por un dialog de shadcn que liste las básculas ya autorizadas con un alias legible, para que el operario elija la correcta en `/control-calidad`.

---

## Por qué existe este spec

El botón "Conectar Báscula" llama hoy a `navigator.serial.requestPort()` (`useSerialScale.tsx:585`), que abre el selector nativo de Chrome. Ese selector lista los puertos como `USB Serial Device (COM3)` sin nombre de fabricante: en una planta con dos o tres adaptadores el operario no distingue cuál es la báscula de su línea.

**Límite técnico que condiciona el diseño:** `requestPort()` **no se puede suprimir ni reemplazar**. Es la única API que concede permiso a un dispositivo nuevo y siempre muestra la UI del navegador. Lo que sí se puede hacer sin diálogo alguno es `navigator.serial.getPorts()`, que devuelve los puertos **ya autorizados** en ese navegador y perfil.

Por eso el diseño es: el dialog propio es el selector de las básculas ya autorizadas, y el nativo aparece únicamente detrás del botón "Autorizar báscula nueva". En la práctica el operario ve el nativo una sola vez por equipo; en el uso diario solo ve el dialog propio, o ni eso, porque la báscula recordada se conecta sola.

---

## Alcance

**Dentro:**

- Dialog de shadcn (`components/ui/dialog.tsx`) que lista las básculas autorizadas devueltas por `getPorts()`.
- Alias por báscula, pedido una única vez al autorizarla, persistido en `localStorage`.
- Botón "Autorizar báscula nueva" dentro del dialog, que dispara `requestPort()` (el nativo de Chrome).
- Persistencia de la báscula preferida y auto-conexión al montar `/control-calidad` cuando esa báscula sigue presente.
- Anclaje de la reconexión automática de `useSerialScale` a la báscula elegida (hoy cae en `puertos[0]`).
- Hook nuevo `useSelectorBascula` con su test de Vitest.
- Cableado únicamente en `/control-calidad`.

**Fuera de alcance (para specs futuros):**

- Prueba de lectura en vivo dentro del dialog ("Probar" con peso en tiempo real antes de confirmar).
- Renombrar el alias de una báscula ya registrada.
- Quitar una báscula de la lista con `port.forget()`.
- Configurar `baudRate` / `dataBits` / paridad por báscula desde la UI.
- Catálogo de básculas servido por el backend.
- Cablear el selector en `/crear-pesaje` o cualquier otra pantalla.
- Botón "Cambiar báscula" estando ya conectado: el operario desconecta primero, como hoy.

---

## Modelo de datos

### Tipos nuevos — `src/presentation/types/control-calidad/selector-bascula.types.ts`

```ts
/**
 * Clave estable de una báscula, derivada de los IDs USB del puerto:
 * `"0403:6001"` (vendorId:productId en hex de 4 dígitos).
 * Los puertos sin IDs USB (COM nativo) usan `"sin-id:<índice>"`.
 */
export type ClaveBascula = string

export interface BasculaDisponible {
    clave: ClaveBascula
    /** Nombre que puso el operario. `null` si la báscula nunca recibió alias. */
    alias: string | null
    usbVendorId?: number
    usbProductId?: number
    /** Puerto vivo de Web Serial. No se persiste. */
    puerto: SerialPort
    /** `true` si es la báscula guardada como preferida. */
    esPreferida: boolean
}
```

### Persistencia — `localStorage`

Dos claves versionadas, en la línea de `bascula-ui-theme` que ya usa el `ThemeProvider`:

```ts
// "bascula-alias:v1"
{ "0403:6001": "Báscula Piso 1", "10c4:ea60": "Báscula Recepción" }

// "bascula-preferida:v1"
"0403:6001"
```

Ambas lecturas y escrituras van envueltas en `try/catch`: si `localStorage` no está disponible (SSR, modo privado), el selector funciona igual pero sin memoria entre sesiones.

### Cambio en el hook existente

`useSerialScale` recibe una prop opcional nueva:

```ts
/** Resuelve qué puerto usar al reconectar. Si se omite, se mantiene la búsqueda actual. */
resolverPuertoAutorizado?: () => Promise<SerialPort | null>
```

No se agregan campos al estado de `useSerialScale` ni cambian los tipos de `bascula.types.ts`.

---

## Plan de implementación

1. **Crear `src/presentation/types/control-calidad/selector-bascula.types.ts`** con `ClaveBascula` y `BasculaDisponible`. Verificación: `npx tsc --noEmit` pasa.

2. **Crear `src/presentation/hooks/bascula/almacenamientoBasculas.ts`**: módulo puro con `claveDePuerto(info, indice)`, `leerAlias()`, `guardarAlias(clave, alias)`, `leerPreferida()`, `guardarPreferida(clave)`. Todo con `try/catch` alrededor de `localStorage` y guardas de `typeof window === 'undefined'`.

3. **Crear `src/presentation/hooks/bascula/useSelectorBascula.tsx`.** Recibe `{ onSeleccionar: (puerto: SerialPort) => Promise<boolean> }` y expone:
   - `soportado`, `abierto`, `abrir()`, `cerrar()`
   - `basculas: BasculaDisponible[]`, `cargando`
   - `autorizarNueva()` — llama `requestPort()` **directamente en el handler del click**, sin `await` previo, para no perder el gesto de usuario
   - `pendienteDeAlias: BasculaDisponible | null` y `confirmarAlias(alias: string)`
   - `seleccionar(clave: ClaveBascula)` — guarda la preferida, cierra el dialog y llama `onSeleccionar`
   - `resolverPuertoPreferido()` — busca en `getPorts()` la clave preferida; devuelve `null` si no está
   La enumeración ocurre solo dentro de `useEffect` (nunca en render) para no romper el SSR.

4. **Crear `src/presentation/hooks/bascula/useSelectorBascula.test.tsx`** (`// @vitest-environment jsdom`), con un `navigator.serial` falso que implemente `getPorts` y `requestPort`, reutilizando el patrón de `PuertoFalso` de `useSerialScale.test.tsx`. Casos: lista vacía, listar autorizadas, autorizar nueva y guardar alias, recordar la preferida, `resolverPuertoPreferido` devuelve `null` cuando la báscula no está.

5. **Crear `src/presentation/components/control-calidad/SelectorBasculaDialog.tsx`** usando `components/ui/dialog.tsx`. Es un componente presentacional: recibe la lista, el estado y los callbacks. Muestra por fila el alias (o `Puerto USB 0403:6001` si no tiene), los IDs USB en texto pequeño y una marca en la preferida. Estado vacío con el texto "Aún no hay básculas registradas". Pie con el botón "Autorizar báscula nueva". Cuando `pendienteDeAlias` no es `null`, el contenido cambia a un input de alias con botón "Guardar". Tokens semánticos de `styles.css` (`bg-surface`, `text-text-main`, `text-text-muted`, `border-border-ui`).

6. **Modificar `src/presentation/hooks/bascula/useSerialScale.tsx`**: agregar la prop `resolverPuertoAutorizado`, llevarla a `configRef` y usarla al inicio de `buscarPuertoAutorizado` (`useSerialScale.tsx:452`); si está definida, su resultado manda y **no** hay respaldo a `puertos[0]`. Sin la prop, el comportamiento actual no cambia. Verificación: `npx vitest run src/presentation/hooks/bascula/useSerialScale.test.tsx` sigue en verde.

7. **Modificar `src/presentation/hooks/bascula/useControlCalidad.tsx`**: montar `useSelectorBascula`, pasarle `onSeleccionar: (puerto) => scale.connectSerial({ puerto })`, pasar `resolverPuertoAutorizado: selector.resolverPuertoPreferido` a `useSerialScale`, y devolver `selector` en el objeto del hook.

8. **Auto-conexión al montar**, dentro de `useControlCalidad`: un `useEffect` que corre una sola vez, llama `resolverPuertoPreferido()` y, si devuelve un puerto, hace `connectSerial({ puerto })`. Si devuelve `null`, no hace nada: el header se queda en "Desconectada" con su botón, como hoy.

9. **Modificar `src/routes/(portal)/_portal.control-calidad.tsx`**: cambiar `onConnect` de `scale.connectSerial()` a `selector.abrir()` y montar `<SelectorBasculaDialog />` junto a `BloqueoCriticoDialog`. El resto de la ruta no se toca.

---

## Criterios de aceptación

- [ ] Pulsar "Conectar Báscula" en `/control-calidad` abre el dialog de shadcn y **no** abre el diálogo nativo de Chrome.
- [ ] Sin básculas autorizadas, el dialog muestra "Aún no hay básculas registradas" y el botón "Autorizar báscula nueva".
- [ ] "Autorizar báscula nueva" abre el selector nativo de Chrome; al elegir un puerto, el dialog pide un alias y lo guarda.
- [ ] Cancelar el selector nativo deja el dialog abierto y sin cambios, sin mensajes de error.
- [ ] Tras autorizar, la báscula aparece en la lista con su alias y sus IDs USB.
- [ ] Elegir una báscula de la lista cierra el dialog y el header pasa a "Conectando…" y luego a "Báscula en línea".
- [ ] Recargar `/control-calidad` con la báscula conectada físicamente la reconecta sola, sin abrir ningún dialog.
- [ ] Recargar `/control-calidad` con la báscula desenchufada deja el header en "Desconectada" y no abre ningún dialog.
- [ ] Con dos básculas autorizadas, la reconexión automática tras un corte reabre la elegida y no la otra.
- [ ] Los alias sobreviven al cierre del navegador.
- [ ] En Firefox o Safari, el botón "Conectar Báscula" sigue deshabilitado con el estado "Navegador no compatible".
- [ ] `npx vitest run` pasa completo, incluyendo el test nuevo de `useSelectorBascula`.
- [ ] `npx tsc --noEmit` pasa sin errores.

---

## Decisiones

- **Sí:** el dialog propio lista solo puertos ya autorizados (`getPorts()`). **No** se puede reemplazar el nativo: `requestPort()` siempre muestra la UI del navegador. Se acota a un botón explícito dentro del dialog.
- **Sí:** el dialog se abre siempre al pulsar "Conectar Báscula", incluso con la lista vacía. Flujo único y predecible en vez de uno que cambia según el estado.
- **No:** auto-disparar `requestPort()` al abrir el dialog. Chrome puede rechazarlo por pérdida del gesto de usuario.
- **Sí:** alias editable escrito por el operario, persistido por clave `vendorId:productId`. Web Serial no expone nombre de fabricante ni número de serie, así que sin alias todas las filas se ven iguales.
- **No:** catálogo de básculas desde el backend. No existe ese endpoint hoy; el alias local resuelve el problema sin API.
- **Sí:** clave `localStorage` versionada (`:v1`). Permite migrar el formato del alias más adelante sin romper lo guardado.
- **No:** configurar `baudRate` u otros parámetros del puerto desde el dialog. Se mantiene la configuración que ya pasa `useControlCalidad` (9600, 8N1). Si aparece un indicador con otra velocidad, va en su propio spec.
- **Sí:** recordar la báscula y auto-conectar al montar. El operario de planta abre la misma pantalla decenas de veces al día.
- **No:** abrir el dialog solo cuando la báscula recordada está ausente. Un dialog que salta al cargar la página estorba a quien solo iba a consultar.
- **No:** prueba de lectura en vivo dentro del dialog. Si el operario se equivoca lo nota al conectar, porque el hook entra en `sin-senal` a los 4 s y el header lo muestra.
- **No:** renombrar ni quitar básculas (`port.forget()`). El alias se pide una vez y ya. Se puede añadir después sin rehacer nada.
- **Sí:** hook nuevo `useSelectorBascula` en vez de engordar `useSerialScale`. Ese hook es el núcleo del producto y tiene el test más delicado del repo; se toca lo mínimo.
- **Sí:** anclar la reconexión automática mediante la prop opcional `resolverPuertoAutorizado`. El respaldo actual a `puertos[0]` reconectaría contra la báscula equivocada en cuanto haya dos autorizadas.
- **No:** cablearlo en `/crear-pesaje`. El componente queda reutilizable, pero verificar dos pantallas en el mismo spec amplía la superficie sin necesidad.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Dos adaptadores del mismo modelo comparten `vendorId:productId` y por tanto la misma clave y el mismo alias. | Web Serial no expone número de serie: no hay forma de distinguirlos por software. Se documenta en el código; el operario los diferencia desenchufando uno. Si se vuelve un problema real, la prueba de lectura en vivo (fuera de alcance) es la solución. |
| Puertos sin IDs USB (COM nativo) no tienen clave estable entre sesiones. | Se listan con clave `sin-id:<índice>`; se muestran en el dialog y se pueden elegir, pero su alias y su condición de preferida pueden perderse al reordenarse los puertos. |
| `requestPort()` rechazado por pérdida del gesto de usuario. | Se invoca directamente en el `onClick` del botón, sin `await` ni trabajo asíncrono antes. |
| `localStorage` no disponible (SSR, modo privado). | Toda lectura/escritura va en `try/catch` con guarda de `typeof window`. El selector funciona sin memoria entre sesiones. |
| `navigator.serial` no existe durante el render del servidor (TanStack Start es SSR). | La enumeración ocurre solo dentro de `useEffect`. En el primer render `soportado` es `false` y el dialog no consulta nada. |
| El usuario revoca el permiso desde la configuración de Chrome. | La báscula desaparece de `getPorts()` y por tanto del dialog. El operario la vuelve a autorizar con el botón; el alias guardado se reutiliza al recuperar la misma clave. |
| La auto-conexión falla al abrir el puerto (ocupado por otra pestaña). | `useSerialScale` deja el estado en `error` y el header muestra el mensaje junto al botón "Conectar Báscula", que sigue disponible. |

---

## Lo que **no** entra en este spec

- Prueba de lectura en vivo dentro del dialog.
- Renombrar o quitar básculas registradas.
- Configuración de `baudRate` y demás parámetros del puerto desde la UI.
- Catálogo de básculas desde el backend.
- El selector en `/crear-pesaje` u otras pantallas.
- Botón "Cambiar báscula" sin desconectar antes.

Cada uno de ellos, si se hace, va en su propio spec.
