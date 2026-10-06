# SPEC 13 — Mirador conectado a la planta en vivo

> **Estado:** Approved
> **Depende de:** SPEC 32 del backend (`core-control-calidad-agro-backend/specs/32-foto-de-la-planta-en-vivo.md`), ya implementado en la rama `spec-32-foto-de-la-planta-en-vivo` del backend
> **Fecha:** 2026-10-06
> **Objetivo:** Reemplazar el servidor simulado del Mirador (`plantSnapshotMock.ts`) por `GET /plantas/en-vivo` y `GET /pesajes/byLote/:loteId`, ajustando los tipos al contrato real: tres casillas (`en-pesaje`, `por-aprobar`, `finalizado`), sin `documento_fiscal`, `fuera_de_rango` booleano y polling cada 1 a 2 minutos.

---

## Por qué existe este spec

La pantalla `/mirador` está armada y corre contra `getPlantMockServer()`. El backend ya expone `GET /plantas/en-vivo` (SPEC 32 del backend), y su forma es **casi** la del mock. Este spec cierra el "casi". Cuatro cosas conviene tener claras antes de leer el resto.

**La primera: no hay casilla de despacho.** El backend decidió que el tablero termina en `finalizado`, que hace de "listo para salir". El string que viaja es `'finalizado'`, no `'despacho'`, y los lotes **no** traen `documento_fiscal`. El front hoy usa `'despacho'` como id interno (con la etiqueta "Finalizado") y pinta un número de factura sobre la caja. Las dos cosas se van.

**La segunda: el polling pasa de 10 s a 1–2 minutos.** El backend lo dimensionó así (decisión explícita del usuario): menos de una petición por segundo con 50 pantallas. Y hay una ventana que depende de eso: un lote **rechazado** viaja sólo **5 minutos** desde `rechazado_en`; con un intervalo de hasta 2 min, una pantalla activa siempre ve al menos una foto con él. **El intervalo no puede pasar de 2 minutos** sin pedir antes al backend que agrande esa ventana.

**La tercera: la foto es la verdad, el diff lo hace el front.** El backend no manda eventos ni guarda qué vio cada pantalla. `diffPlantSnapshot` sigue siendo quien decide qué cambió, y depende de dos reglas que el backend garantiza (ver Modelo de datos). Este spec no cambia el diff, sólo lo que le llega.

**La cuarta: es la planta entera.** El endpoint no filtra por `cliente_operador` ni exige permiso: cualquier usuario autenticado ve todos los clientes. No hace falta (ni sirve) un permiso en el menú.

---

## Alcance

**Dentro:**

- `plantTwin.types.ts`: `PlantStage` pasa a `'en-pesaje' | 'por-aprobar' | 'finalizado' | 'rechazado'`; se quita `documento_fiscal` de `PlantLot`; `fuera_de_rango` pasa a `boolean`; los campos que el backend puede mandar en `null` se tipan así (ver tabla).
- Renombrar `'despacho'` → `'finalizado'` en todo `src/presentation/**/mirador/**` (escena, `layout.ts`, `assignSlots.ts`, `describeEvents.ts`, tests). `tsc` encuentra cada uso.
- Quitar todo lo que lee `documento_fiscal`: el bloque de `LotPanel.tsx`, el `docLabel` de `PlantScene.ts` y el sufijo ` con <factura>` de `describeEvents.ts`.
- `usePlantTwin`: el interior pasa a `useExecuteQuery<PlantSnapshotResponse>(['planta', 'en-vivo'], '/plantas/en-vivo', …)` con polling de 1–2 min, desfase aleatorio y sólo con la pestaña visible.
- `INTERVALO_POLLING_MS` y `FOTO_VIEJA_MS` con los valores nuevos.
- Espaciar los vuelos de pesajes a lo largo del intervalo (hoy van cada 1,15 s fijos).
- `useLotWeighings`: el interior pasa a `useGetInspeccionPesajes({ loteId })` (`GET /pesajes/byLote/:loteId`), mapeado a `PlantWeighing`, y se refresca cuando la foto trae cambios en ese lote.
- `PesajeData.fuera_de_rango` pasa a `boolean` (el backend ya lo manda así).
- Borrar `plantSnapshotMock.ts` (o dejarlo sólo para tests, ver Decisiones).
- `<Suspense>` + `<ErrorBoundary>` alrededor de lo que use los dos hooks, como pide `useExecuteQuery`.
- Actualizar `CLAUDE.md` del front si menciona el mock o la casilla de despacho.

**Fuera de alcance (para specs futuros):**

- Casilla de despacho, número de factura o camión ligados a un documento fiscal. El backend lo dejó fuera a propósito; volver a tenerlo exige un spec allá primero.
- Push (SSE/WebSocket). El backend no lo ofrece.
- Filtro por cartera o por cliente en el Mirador.
- Un permiso `MODULO-MIRADOR` para esconder el menú.
- Varias plantas.
- Cambios en la geometría o el arte de la escena más allá de quitar lo que leía `documento_fiscal`.

---

## Modelo de datos

### Contrato del backend: `GET /plantas/en-vivo`

- **Auth:** bearer token como cualquier ruta. Sin token → **401**. No tiene query params ni body. No tiene 400/404: o 200, o 401, o 500.
- **Respuesta 200:**

```json
{
  "ok": true,
  "msg": "Planta obtenida correctamente",
  "planta": {
    "generado_en": "2026-10-05T15:42:10.000Z",
    "kpis": {
      "pesajes_hoy": 214,
      "peso_neto_hoy": 9876.4,
      "pct_en_rango_hoy": 96.26,
      "lotes_activos": 11,
      "clientes_con_actividad_hoy": 4
    },
    "clientes": [
      {
        "id": 101,
        "nombre": "Beneficio Montaña Azul",
        "producto": "Café oro",
        "codigo_exportacion": "EXP-0142",
        "lotes": [
          {
            "id": 901,
            "nombre_lote": "L-2610-06",
            "producto": "Café oro",
            "unidad_medida": "kg",
            "etapa": "en-pesaje",
            "peso_minimo": "68.60",
            "peso_ideal": "69.00",
            "peso_maximo": "69.50",
            "bultos": 18,
            "bultos_fuera_rango": 1,
            "peso_neto_total": 1242.37,
            "ultimos_pesajes": [
              {
                "id": 45213,
                "peso_neto": "69.04",
                "fuera_de_rango": false,
                "estado_calidad_codigo": "IDEAL",
                "usuario": "María Castillo",
                "created_at": "2026-10-05T15:41:58.000Z"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Campo por campo, y en qué difiere del tipo actual

| Campo | Tipo real | Tipo hoy en el front | Nota |
| --- | --- | --- | --- |
| `planta.generado_en` | `string` ISO con `Z` | `string` | Reloj de MySQL. **No** compararlo con `Date.now()` del navegador (las zonas no están fijadas); el "foto vieja" sigue usando `dataUpdatedAt`. |
| `kpis.pesajes_hoy` | `number` | igual | Todos los pesajes activos de hoy de la planta, no sólo de los lotes de la foto. |
| `kpis.peso_neto_hoy` | `number` (2 dec.) | igual | `0` sin pesajes. |
| `kpis.pct_en_rango_hoy` | `number \| null` | igual | **`null`** si `pesajes_hoy = 0`. Pintar "—", nunca `0 %`. |
| `kpis.lotes_activos` | `number` | igual | `en-pesaje` + `por-aprobar` de la foto. |
| `kpis.clientes_con_actividad_hoy` | `number` | igual | |
| `clientes[]` | | | Sólo clientes con al menos un lote en la foto, orden `id` ASC. Un cliente sin lotes **no viaja**. |
| `cliente.producto` | `string \| null` | igual | |
| `cliente.codigo_exportacion` | `string \| null` | igual | |
| `lotes[]` | | | Orden `id` ASC. |
| `lote.producto` | `string \| null` | `string` | **Cambia.** Viene de un `LEFT JOIN`. |
| `lote.unidad_medida` | `string \| null` | `string` | **Cambia.** Ídem. |
| `lote.etapa` | `'en-pesaje' \| 'por-aprobar' \| 'finalizado' \| 'rechazado'` | con `'despacho'` | **Cambia.** Minúsculas y con guion. Las etiquetas las pone el front. |
| `lote.peso_minimo/ideal/maximo` | `string` decimal (`"69.00"`) | igual | Sin convertir. |
| `lote.bultos` | `number` | igual | Pesajes activos de **todo** el lote: la verdad del conteo. |
| `lote.bultos_fuera_rango` | `number` | igual | |
| `lote.peso_neto_total` | `number` (2 dec.) | igual | `0` sin pesajes. |
| `lote.documento_fiscal` | **no existe** | `string \| null` | **Se quita.** |
| `lote.ultimos_pesajes` | `PlantWeighing[]` | igual | Los **10** activos de mayor `id`, orden **`id` DESC**. `[]` si no tiene. |
| `pesaje.id` | `number` | igual | Correlativo, nunca se reutiliza. |
| `pesaje.peso_neto` | `string` | igual | |
| `pesaje.fuera_de_rango` | **`boolean`** | `number` (0/1) | **Cambia.** `qualityLevel`/`targetPoint` ya aceptan `number \| boolean`, así que sólo cambia el tipo y el mock. |
| `pesaje.estado_calidad_codigo` | `'IDEAL' \| 'MAXIMO' \| 'MINIMO' \| null` | `string` | **Los valores cambian**: el mock inventaba `EN_RANGO`/`FUERA_RANGO`. Si algo de la UI los compara, hay que ajustarlo. |
| `pesaje.usuario` | `string \| null` | `string` | `null` si el usuario fue borrado (no pasa hoy, pero el join lo admite). |
| `pesaje.created_at` | `string` ISO con `Z` | `string` | |

### Qué lote entra en la foto (y cuándo sale)

| Etapa en la base | `etapa` | Está en la foto |
| --- | --- | --- |
| `EN_PROCESO` | `en-pesaje` | Siempre |
| `CLIENTE_FINAL` | `por-aprobar` | Siempre |
| `FINALIZADO` | `finalizado` | **7 días** desde que se finalizó |
| `RECHAZADO` | `rechazado` | **5 minutos** desde que se rechazó |

- Cuando un lote sale de su ventana **desaparece** de la foto: `diffPlantSnapshot` lo emite como `lot-removed` con `reason: 'salida'` (finalizado) o `'rechazado'` si la foto anterior lo traía rechazado.
- Un lote rechazado puede saltar directo de `en-pesaje` o `por-aprobar` a `rechazado` y, si la pestaña estuvo dormida más de 5 min, desaparecer sin haber pasado nunca por `rechazado` en este front. Se anima como "dejó el tablero"; es aceptado.
- Un cliente con `isActive = 0` desaparece con todos sus lotes.
- En la base de desarrollo hay **tres lotes abiertos con `etapa_id` en `NULL`** (ids 1, 7 y 8) que **no** salen en la foto. No es un bug del front.

### Las dos reglas que el backend garantiza (y de las que depende el diff)

1. **Los ids de pesaje son correlativos y nunca se reutilizan**, y `ultimos_pesajes` viene por `id` DESC. "Pesaje nuevo" = `id` mayor que el mayor que ya se veía en ese lote.
2. **`bultos` cuenta todo el lote; `ultimos_pesajes` es sólo una ventana de 10.** Una anulación se detecta porque `bultos` baja más de lo que explican los pesajes nuevos. Si entran más de 10 pesajes en un intervalo, el exceso se conoce sólo por el delta de `bultos` (sin detalle de peso); con un bulto cada 20–30 s y 2 min de intervalo son 4–6, así que es raro.

### `GET /pesajes/byLote/:loteId` (detalle del lote en el Mirador)

- Ya existe y ya lo consume `useGetInspeccionPesajes`. Devuelve **todos** los pesajes activos del lote con `fuera_de_rango` **booleano**, orden **`created_at` DESC** (no `id`). Para el panel da igual; si algún componente necesita orden estricto por id, ordenar en el cliente.
- No pagina y no filtra por cartera.
- `useLotWeighings` lo mapea a `PlantWeighing` (`id`, `peso_neto`, `fuera_de_rango`, `estado_calidad_codigo`, `usuario`, `created_at` como string).

### Tipos que cambian

```ts
// plantTwin.types.ts
export type PlantStage = 'en-pesaje' | 'por-aprobar' | 'finalizado' | 'rechazado'
export const ACTIVE_STAGES: ActiveStage[] = ['en-pesaje', 'por-aprobar', 'finalizado']
export const STAGE_LABEL: Record<PlantStage, string> = {
    'en-pesaje': 'En pesaje',
    'por-aprobar': 'Por aprobar',
    'finalizado': 'Finalizado',
    'rechazado': 'Rechazado',
}

export interface PlantLot {
    // ...
    producto: string | null
    unidad_medida: string | null
    // documento_fiscal: eliminado
}

export interface PlantWeighing {
    id: number
    peso_neto: string
    fuera_de_rango: boolean
    estado_calidad_codigo: string | null
    usuario: string | null
    created_at: string
}

// pesajesResponse.ts
export interface PesajeData {
    // ...
    fuera_de_rango: boolean
}
```

### Polling

```ts
/** Base del intervalo; a cada pedido se le suma un desfase aleatorio. */
export const INTERVALO_POLLING_MS = 75_000
/** Hasta este desfase extra, para que las pantallas no pidan todas a la vez. */
export const DESFASE_POLLING_MS = 30_000
/** Sin foto nueva en este tiempo, el indicador "en vivo" avisa. Más de dos intervalos máximos. */
export const FOTO_VIEJA_MS = 4 * 60_000
```

- Intervalo efectivo: 75–105 s, siempre **≤ 2 min** (ver "Por qué existe").
- `refetchInterval` de React Query acepta una función: devolver `INTERVALO_POLLING_MS + Math.random() * DESFASE_POLLING_MS` en cada ciclo.
- `refetchIntervalInBackground: false` y `refetchOnWindowFocus: true` (al volver a la pestaña se pide enseguida, como hace el mock hoy).
- `staleTime` en `0`; la foto no se cachea entre montajes con sentido.
- El `avanzar(prev, data.planta, dataUpdatedAt)` del comentario actual de `usePlantTwin` se mantiene: compara por referencia, y React Query devuelve la misma referencia si el JSON no cambió (`structuralSharing`), así que una foto idéntica no genera eventos.

### Vuelos repartidos en el intervalo

Hoy `PlantScene` lanza un vuelo cada `ESPACIO_VUELOS = 1.15` s y aplica sin animar lo que pase de `MAX_VUELOS = 6`. Con 10 s de polling eso llenaba el intervalo; con 90 s, los 6 vuelos caen en 7 s y la planta queda quieta 80 s.

Regla nueva: al recibir una foto con `n` pesajes nuevos animables, el espacio entre vuelos es `clamp((INTERVALO_POLLING_MS / 1000) * 0.8 / n, 1.15, 12)` segundos. `MAX_VUELOS` se queda en 6. Si llega una foto nueva con vuelos todavía en cola, los pendientes se aterrizan sin vuelo (lo que ya hace `landWithoutFlight`), para que la escena nunca se atrase respecto del dato.

---

## Plan de implementación

1. **Tipos.** Aplicar los cambios de "Tipos que cambian". Verificación: `npx tsc --noEmit` falla **sólo** en los usos de `'despacho'`, `documento_fiscal` y `fuera_de_rango: number`, que son la lista de trabajo de los pasos 2 y 3.
2. **`despacho` → `finalizado`.** Renombrar en `layout.ts` (`STAGE_INDEX`), `assignSlots.ts`, `PlantScene.ts`, `describeEvents.ts`, el mock y los tests. El comportamiento de la casilla (slots 0 y 2, el camión) **no cambia**, sólo el nombre. Verificación: `tsc` y `npx vitest run` pasan.
3. **Fuera `documento_fiscal`.** Quitar el bloque de `LotPanel.tsx` (líneas ~76–79), el `docLabel` de `PlantScene.ts` (~916–918) y el sufijo de `describeEvents.ts` (~47). Ajustar mock y tests. Verificación: `tsc` y `vitest` pasan; `grep documento_fiscal src/presentation` no devuelve nada en mirador.
4. **`usePlantTwin` contra el endpoint.** Reemplazar el `useState` inicial y el `setInterval` por `useExecuteQuery` con el polling de arriba; mantener `avanzar`, selección y `goUp` tal cual. Verificación manual: `/mirador` carga con datos reales, la pestaña de red muestra `GET /plantas/en-vivo` cada 75–105 s, y deja de pedir con la pestaña oculta.
5. **`useLotWeighings` contra `byLote`.** Interior: `useGetInspeccionPesajes({ loteId })` mapeado a `PlantWeighing[]`. Cuando la foto trae un `weighing-added` o `weighing-voided` del lote seleccionado, `invalidateQueries({ queryKey: ['pesajes', 'byLote', loteId] })`. Si el `lotId` es `-1` (sin selección), no pedir: separar el componente que lo usa o usar `enabled` vía un hook no suspensivo. Verificación: al seleccionar un lote, una sola petición a `/pesajes/byLote/:id`; al entrar un pesaje en ese lote, una más.
6. **Vuelos repartidos.** Aplicar la regla de "Vuelos repartidos". Verificación manual: con 3 pesajes nuevos en una foto, los vuelos se ven separados ~20 s, no en ráfaga.
7. **Mock.** Borrar `plantSnapshotMock.ts` o moverlo a un helper de tests (ver Decisiones). Verificación: `src/` no lo importa fuera de `*.test.ts`.
8. **`CLAUDE.md`.** Documentar el contrato, el intervalo y por qué no puede pasar de 2 min.

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npx vitest run` pasa completo.
- [ ] `/mirador` pide `GET /plantas/en-vivo` al entrar y luego cada 75–105 s, con desfase distinto entre pedidos.
- [ ] Con la pestaña oculta no hay pedidos; al volver hay uno inmediato.
- [ ] Ningún componente del Mirador lee `documento_fiscal` y ningún literal `'despacho'` queda en `src/presentation/**/mirador/**`.
- [ ] Un lote finalizado desde la app (`PATCH /lotes/:id/finalizar/byApprover`) aparece en la casilla "Finalizado" en la foto siguiente.
- [ ] Un lote aprobado (`PATCH /lotes/:id/aprobar`) pasa de "En pesaje" a "Por aprobar" con su animación de cambio de casilla.
- [ ] Un lote rechazado se anima saliendo como rechazado (no como "salió de planta") si la pestaña estuvo visible.
- [ ] Un pesaje nuevo (`POST /pesajes`) se anima cayendo sobre su lote en la foto siguiente, y `bultos` sube en uno.
- [ ] Un pesaje anulado (`PATCH /pesajes/:id/rechazar`) baja `bultos` en uno y se reporta como anulación en el feed.
- [ ] Con `pct_en_rango_hoy: null` la barra de KPIs muestra "—", no `0 %` ni `NaN`.
- [ ] Un lote con `producto` o `unidad_medida` en `null` se pinta sin romper la etiqueta ni el panel.
- [ ] El panel de un lote muestra sus pesajes de `GET /pesajes/byLote/:loteId` y se actualiza cuando entra un pesaje nuevo en ese lote.
- [ ] El indicador "en vivo" no avisa de foto vieja en uso normal, y sí lo hace si el backend deja de responder más de 4 min.
- [ ] Un error del endpoint (backend caído) cae en el `ErrorBoundary`, no en una pantalla en blanco.
- [ ] Sin token (sesión vencida) el Mirador se comporta como cualquier otra ruta ante un 401.

---

## Decisiones

- **Sí:** renombrar `'despacho'` → `'finalizado'` en el front. **No:** traducir en el borde (`finalizado` → `despacho` dentro de `usePlantTwin`). Con el rename, el tipo es el contrato y no hay un segundo vocabulario que mantener; `tsc` encuentra todos los usos.
- **Sí:** quitar `documento_fiscal` por completo. El backend no lo manda ni lo va a mandar sin un spec nuevo allá.
- **Sí:** `fuera_de_rango` booleano en `PlantWeighing` **y** en `PesajeData`. Los dos endpoints ya lo mandan así; `0/1` era el tipo del mock.
- **Sí:** intervalo 75 s + desfase 0–30 s. **No:** 10 s como hoy (el backend se dimensionó para 1–2 min). **No:** más de 2 min (rompe la ventana de 5 min del rechazado).
- **Sí:** el "foto vieja" sobre `dataUpdatedAt` del navegador, no sobre `generado_en`. Los relojes de MySQL y del navegador no están sincronizados ni en la misma zona garantizada.
- **Sí:** repartir los vuelos a lo largo del intervalo. Es lo que el backend asumió al elegir polling lento.
- **A decidir al aprobar:** borrar `plantSnapshotMock.ts` o conservarlo como fixture de tests. Recomendado: borrarlo; los tests de `diffPlantSnapshot` y `assignSlots` ya arman sus fotos a mano.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Si alguien baja el intervalo a 10 s "para que se vea más vivo", 50 pantallas son 5 req/s contra cinco consultas cada una. | Documentado en `CLAUDE.md`. El backend no tiene cache; un cambio de intervalo se acuerda con el backend. |
| Si alguien sube el intervalo por encima de 2 min, los rechazos pueden no verse nunca. | Ídem. La ventana de 5 min vive en el backend (`plantas.repository.ts`). |
| Más de 10 pesajes de un lote en un intervalo: el front no tiene el detalle de los que faltan. | El diff ya los cuenta por el delta de `bultos`. Raro con el ritmo actual de la báscula. |
| `estado_calidad_codigo` reales (`IDEAL`/`MAXIMO`/`MINIMO`) distintos de los del mock. | El color sale de `fuera_de_rango` + desvío, no del código. Revisar que nada compare contra `EN_RANGO`. |
| Lotes viejos con `etapa_id` en `NULL` no salen en el tablero. | Es una regla del backend; se arregla con datos, no en el front. |
| Un OPERADOR ve clientes que no son de su cartera. | Decisión del usuario en el backend. |

---

## Lo que **no** entra en este spec

- Casilla de despacho, factura o camión ligados al módulo fiscal.
- SSE/WebSocket.
- Filtros, varias plantas o permiso de menú para el Mirador.
- Cambios en el arte de la escena.

Cada uno, si se hace, va en su propio spec (y los que dependen de datos nuevos, primero en el backend).
