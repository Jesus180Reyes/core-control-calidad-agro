# SPEC 15 — Tablero de métricas de calidad

> **Estado:** Approved
> **Depende de:** SPEC 35 del backend (`core-control-calidad-agro-backend/specs/35-metricas-de-calidad-de-pesajes.md`), implementado en la rama `spec-35-metricas-de-calidad-de-pesajes` del backend y **todavía sin mergear**; SPEC 07 (permisos) y SPEC 08 (`DataTable`) de este repo
> **Fecha:** 2026-10-09
> **Objetivo:** Agregar la pantalla `/metricas`, con un item "Métricas" en el `Sidebar` debajo de "Clientes", que pinta los indicadores de `GET /metricas/calidad` en un tablero clay y minimalista, filtrable por período, cliente y operador.

---

## Por qué existe este spec

El backend ya calcula la calidad de lo pesado en un período: el porcentaje fuera de rango, la desviación frente al peso ideal, los veredictos del aprobador, las anulaciones, la distribución por estado de calidad y el desglose por cliente (SPEC 35 del backend). Hoy no hay ninguna pantalla que lo muestre. Para saber cómo viene la calidad del mes hay que entrar a MySQL.

Hay tres cosas que conviene saber antes de leer el resto.

**La primera: el front no calcula nada.** Todos los porcentajes y desviaciones llegan ya calculados, con 2 decimales, y en `null` cuando no hay datos. La pantalla formatea y dibuja, pero no divide. Un `null` se pinta como "—" y nunca como `0`.

**La segunda: el período lo resuelve el backend.** Sin fechas, el backend usa los últimos 30 días según el reloj de MySQL, que va en UTC y de noche ya está en el día siguiente. Por eso la pantalla **siempre** muestra el `periodo` que devuelve la respuesta y nunca uno calculado en el navegador.

**La tercera: el endpoint está abierto y el item no.** `GET /metricas/calidad` responde a cualquier usuario autenticado. El item del `Sidebar` va detrás de un permiso nuevo, `VER-METRICAS`, para que un operario de báscula no tenga a la vista el rendimiento de los demás. Ocultarlo es comodidad, no control (`CLAUDE.md`, Permisos): quien escriba `/metricas` a mano entra.

---

## Alcance

**Dentro:**

- Ruta `/metricas` (`routes/(portal)/_portal.metricas.tsx`).
- Item "Métricas" en el `Sidebar`, como entrada de `menuItems` **inmediatamente debajo de "Clientes"**, con el ícono `ChartNoAxesCombined` y el permiso `VER-METRICAS`.
- `VERMETRICAS: 'VER-METRICAS'` en `PERMISSIONS`.
- La barra de filtros:
  - chips de período: 7 días, 30 días (por defecto), 90 días, Este mes y Personalizado;
  - un rango a mano con los dos `ControlledDatePicker`, que aparece al elegir Personalizado;
  - un selector de cliente y uno de operador.
- Cuatro tarjetas de indicadores: pesajes, fuera de rango, rechazo del aprobador y anulación.
- Una tarjeta de desviación frente al ideal, con un medidor divergente centrado en 0.
- Una tarjeta de distribución por estado de calidad, con una barra segmentada y su leyenda.
- El desglose por cliente en el `DataTable`, con mini barras dentro de las celdas. Al hacer click en una fila se filtra el tablero por ese cliente.
- Un chip removible "Cliente: X ×" (y "Operador: Y ×") mientras haya un filtro de cliente u operador activo.
- Todos los gráficos hechos a mano con SVG y CSS, **sin librería de gráficos**.
- Un token nuevo `shadow-clay-inset` en `styles.css`.
- Los tipos del contrato.
- Un helper puro que arma los params, con sus tests.
- `CLAUDE.md` actualizado.

**Fuera de alcance (para specs futuros):**

- Un acceso a Métricas en la portada (`HomeView`). Decisión del usuario.
- Series temporales y tendencia por día. El backend no las devuelve.
- Desgloses por producto o por operador. El backend tampoco los devuelve.
- Los bloques B a E del módulo de métricas del backend (productividad, flujo de lotes, fiscal, clientes).
- Exportar a CSV, Excel o PDF.
- Guardar los filtros en la URL o en `localStorage`. Viven en el estado de la ruta, igual que en `/historial`.
- Refresco automático o polling.
- Un guard de permisos en la ruta.
- Cualquier cambio en el backend, salvo el seed del permiso.

---

## Modelo de datos

### Contrato del backend (SPEC 35)

`GET /metricas/calidad`, con token. Query params opcionales:

| Param | Formato | Notas |
| --- | --- | --- |
| `desde` | `YYYY-MM-DD` | Si viene solo, el backend completa `hasta` con `CURDATE()`. |
| `hasta` | `YYYY-MM-DD` | Inclusivo de todo el día. Si viene solo, `desde` es `hasta - 29 días`. |
| `cliente_id` | entero > 0 | |
| `usuario_id` | entero > 0 | |

Sin fechas, el período son los últimos 30 días con hoy incluido, según el reloj de MySQL.

**Un valor inválido responde 400**, a diferencia de los filtros de `/pesajes/historial`, y lo mismo un `desde` posterior a `hasta`. La pantalla nunca debería mandar uno: las fechas salen de `toDateParam` y los ids de selectores. Un 400 que se escape cae en el `ErrorBoundary` del tablero.

Respuesta **200**:

```json
{
  "ok": true,
  "msg": "Metricas de calidad obtenidas correctamente",
  "metricas": {
    "periodo": { "desde": "2026-09-11", "hasta": "2026-10-10" },
    "filtros": { "cliente_id": null, "usuario_id": null },
    "resumen": {
      "total_pesajes": 103, "fuera_de_rango": 15, "porcentaje_fuera_de_rango": 14.56,
      "desviacion_promedio_pct": 2.08, "desviacion_estandar_pct": 11.74,
      "aprobados_por_aprobador": 48, "rechazados_por_aprobador": 9, "sin_revisar": 46,
      "porcentaje_rechazo_aprobador": 15.79, "anulados": 1, "porcentaje_anulacion": 0.96
    },
    "por_estado_calidad": [
      { "estado_calidad_id": 1, "codigo": "IDEAL", "nombre": "PESO IDEAL", "total": 88, "porcentaje": 85.44 }
    ],
    "por_cliente": [
      { "cliente_id": 40, "cliente": "GOKU Y SUS AMIGOS", "total_pesajes": 82, "...": "los once campos del resumen" }
    ]
  }
}
```

- Todos los conteos son `number`. Los porcentajes y desviaciones son `number | null`.
- La desviación **tiene signo**: positiva significa que se pesa por encima del ideal (se regala producto) y negativa que se pesa por debajo (riesgo de reclamo).
- `por_estado_calidad` trae **todas** las filas del catálogo, también las que tienen `total: 0`, ordenadas por id.
- `por_cliente` viene ordenado por `total_pesajes` DESC e incluye a los clientes rechazados. `cliente` puede ser `null`.
- `sin_revisar` **no** es la cola del aprobador: incluye pesajes de lotes que todavía no llegaron a `CLIENTE_FINAL`. La pantalla lo rotula como "sin revisar" y no como "pendientes".

### Tipos — `src/presentation/types/metricas/qualityMetrics.types.ts`

```ts
export interface QualityIndicators {
    total_pesajes: number
    fuera_de_rango: number
    porcentaje_fuera_de_rango: number | null
    desviacion_promedio_pct: number | null
    desviacion_estandar_pct: number | null
    aprobados_por_aprobador: number
    rechazados_por_aprobador: number
    sin_revisar: number
    porcentaje_rechazo_aprobador: number | null
    anulados: number
    porcentaje_anulacion: number | null
}

export interface QualityStateMetric {
    estado_calidad_id: number
    codigo: string
    nombre: string
    total: number
    porcentaje: number | null
}

export interface ClientQualityMetrics extends QualityIndicators {
    cliente_id: number
    cliente: string | null
}

export interface QualityMetrics {
    periodo: { desde: string; hasta: string }
    filtros: { cliente_id: number | null; usuario_id: number | null }
    resumen: QualityIndicators
    por_estado_calidad: QualityStateMetric[]
    por_cliente: ClientQualityMetrics[]
}

export interface QualityMetricsResponse {
    ok: boolean
    msg: string
    metricas: QualityMetrics
}
```

Los identificadores nuevos van en inglés (`CLAUDE.md`). Los campos del contrato quedan como los manda el backend.

### Estado de los filtros — `src/presentation/hooks/metricas/qualityMetricsParams.ts`

```ts
export type PeriodPreset = '7d' | '30d' | '90d' | 'month' | 'custom'

export interface QualityMetricsFilters {
    preset: PeriodPreset
    desde?: Date          // sólo con preset 'custom'
    hasta?: Date          // sólo con preset 'custom'
    cliente_id?: number
    usuario_id?: number
}

export const DEFAULT_QUALITY_METRICS_FILTERS: QualityMetricsFilters = { preset: '30d' }

export function buildQualityMetricsParams(
    filters: QualityMetricsFilters,
    today?: Date,          // inyectable para los tests; por defecto new Date()
): { desde?: string; hasta?: string; cliente_id?: number; usuario_id?: number }
```

Reglas de `buildQualityMetricsParams`:

| Preset | Params de fecha |
| --- | --- |
| `30d` | **Ninguno.** El default lo pone el backend. |
| `7d` | `desde = hoy − 6 días`, sin `hasta` |
| `90d` | `desde = hoy − 89 días`, sin `hasta` |
| `month` | `desde = día 1 del mes actual`, sin `hasta` |
| `custom` | `desde`/`hasta` con `toDateParam`. Los dos vacíos equivalen a `30d`. |

- "Hoy" es la fecha **local** del navegador, formateada con `toDateParam` y nunca con `toISOString()`.
- Los presets **no mandan `hasta`**. Así el backend lo completa con su `CURDATE()` y el rango termina en el "hoy" del mismo reloj con el que se escribió `created_at`.
- `cliente_id` y `usuario_id` pasan tal cual cuando están definidos. Nunca se manda `''`: `query-params.ts` sí manda los strings vacíos, y el backend respondería 400.

### Hook — `src/presentation/hooks/metricas/useQualityMetrics.tsx`

```ts
export function useQualityMetrics(filters: QualityMetricsFilters): QualityMetrics
```

- Usa `useExecuteQuery<QualityMetricsResponse>(['metricas', 'calidad', params], '/metricas/calidad', { params })`.
- `params` sale de `buildQualityMetricsParams(filters)`.
- Suspende. Quien lo use va dentro de `<Suspense>` y `ErrorBoundary`.
- Sin `staleTime` propio: volver a un filtro ya visitado sale de la caché con la política por defecto.

### Lenguaje visual — Clay + minimalista

Este es el contrato de diseño de la pantalla. Lo que no esté acá no se agrega. La regla de fondo: **una superficie, un acento, mucho aire**. Los números son los protagonistas y el color solo aparece cuando significa algo.

**Superficies**

- Tarjetas: `rounded-[28px] border border-border-ui/60 bg-surface shadow-clay-card`, el mismo trato que el `Sidebar`. Relleno interno `p-6` (`p-5` en móvil). Separación entre tarjetas `gap-5`.
- Pistas hundidas: el fondo de anillos, barras y medidores. Llevan `bg-bg-app shadow-clay-inset rounded-full`. Es el único relieve "hacia adentro" de la pantalla, y es lo que da el aspecto clay sin decorar.
- Token nuevo en el `@theme` de `styles.css`:
  ```css
  --shadow-clay-inset:
    inset 2px 2px 5px rgba(46, 107, 69, 0.08),
    inset -2px -2px 5px rgba(255, 255, 255, 0.7);
  ```
  En `.dark` el blanco del segundo inset se ve como un halo. Se redefine con una variable (`--clay-inset-light`) que en oscuro vale `rgba(255, 255, 255, 0.03)`.
- Prohibido:
  - sombras apiladas (una tarjeta lleva una sola sombra);
  - degradados en tarjetas o gráficos;
  - bordes en los gráficos;
  - cuadrícula, ejes o ticks en cualquier gráfico;
  - el look por defecto de `Card` de shadcn;
  - íconos decorativos en cada tarjeta (solo lleva ícono el header de la tabla, con `SectionCardHeader`);
  - emojis.

**Tipografía**

- Rótulo de tarjeta: `text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted`, el mismo idioma que los rótulos del `Sidebar`.
- Valor principal: `text-4xl font-extrabold tracking-tight tabular-nums text-text-main`, con la unidad en `text-base font-semibold text-text-muted` pegada al número (`14,56 %`).
- Línea de apoyo: `text-xs font-medium text-text-muted`.
- Formato numérico: `toLocaleString('es')`. Porcentajes y desviaciones con 2 decimales fijos, conteos sin decimales. La desviación siempre lleva el signo (`+2,08 %`, `−4,77 %`, con el menos tipográfico). `null` → "—" en `text-text-muted`.

**Color, con significado y nada más**

| Significado | Token |
| --- | --- |
| Acento de la pantalla (chip de período activo, foco, estado `IDEAL`) | `brand` |
| Fuera de rango, desviación positiva, estado `MAXIMO` | `warning` |
| Rechazo del aprobador, desviación negativa, estado `MINIMO` | `destructive` |
| Anulación, `sin_revisar`, estados desconocidos | `text-muted` al 40% |

Un `codigo` de estado que no sea `IDEAL`, `MAXIMO` ni `MINIMO` se pinta neutro. No se hardcodean ids, porque difieren entre entornos.

**Movimiento**

- Entrada de las tarjetas: `animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500`, escalonadas de a 60 ms.
- Anillos: `stroke-dashoffset` con `transition-[stroke-dashoffset] duration-700 ease-out`, que arranca vacío y se llena al montar.
- Barras: `transition-[width]` de 500 ms.
- Nada se anima en bucle. Con movimiento reducido, el bloque global de `styles.css` ya lo apaga, así que no hace falta código propio.

**Modo oscuro**: solo con los tokens. Ningún color crudo fuera de `styles.css`.

### Composición de la pantalla

```
┌──────────────────────────────────────────────────────────────────┐
│ Métricas de calidad                                              │
│ Del 11 sep al 10 oct de 2026                                     │
├──────────────────────────────────────────────────────────────────┤
│ (7 días)(●30 días)(90 días)(Este mes)(Personalizado)  [Cliente▾][Operador▾] │
│ [Desde ▾] [Hasta ▾]           ← sólo con Personalizado           │
│ Cliente: GOKU Y SUS AMIGOS ×                                     │
├───────────────┬───────────────┬───────────────┬──────────────────┤
│ PESAJES       │ FUERA DE RANGO│ RECHAZO APROB.│ ANULACIÓN        │
│ 103           │   ◯ 14,56 %   │   ◯ 15,79 %   │   ◯ 0,96 %       │
│ 1 anulado ·   │ 15 de 103     │ 48 aprobados ·│ 1 de 104         │
│ 46 sin revisar│               │ 9 rechazados  │                  │
├───────────────┴───────────────┴──────┬────────┴──────────────────┤
│ DESVIACIÓN FRENTE AL IDEAL           │ ESTADOS DE CALIDAD         │
│ +2,08 %  ± 11,74 % de dispersión     │ [████████████▒▒▒░░]        │
│ −15 ───────[░░░░░|●░░░░░]─────── +15 │ ● Peso ideal   88  85,44 % │
│ Por encima del ideal                 │ ● Peso máximo   5   4,85 % │
│                                      │ ● Peso mínimo  10   9,71 % │
├──────────────────────────────────────┴────────────────────────────┤
│ ▣ POR CLIENTE                                       4 clientes     │
│ Cliente        Pesajes  Fuera de rango   Desviación   Rechazo  Anul│
│ GOKU Y SUS…        82   ▬▬░░░░ 10,98 %   ░░|▬░ +1,05 %  16,67 %   1│
└───────────────────────────────────────────────────────────────────┘
```

- **Grilla:** `xl:grid-cols-4` para los indicadores. Desviación y estados van en `lg:grid-cols-5`, con la desviación en `col-span-3` y los estados en `col-span-2`. En móvil todo pasa a una columna y los chips de período hacen scroll horizontal sin barra visible.
- **Encabezado:** `ClientesHeader` con `titulo="Métricas de calidad"` y, de `descripcion`, el período de la respuesta formateado como "Del 11 sep al 10 oct de 2026". Usa `date-fns` con locale `es`, y el `YYYY-MM-DD` se parsea como fecha **local** (`parse(..., 'yyyy-MM-dd', new Date())`), nunca con `new Date('YYYY-MM-DD')`, que lo toma como UTC y corre el día. El período sale del tablero, que está suspendido, así que el header lo pinta el propio tablero y no la ruta.

### Componentes nuevos

| Componente | Archivo | Qué hace |
| --- | --- | --- |
| `PeriodChips` | `components/metricas/PeriodChips.tsx` | Control segmentado de los cinco presets, sobre una pista hundida. Chip activo: `bg-surface shadow-clay-btn text-brand`. Chip inactivo: transparente con `text-text-muted`. Es un `role="radiogroup"` con flechas de teclado. |
| `MetricsFilterBar` | `views/metricas/MetricsFilterBar.tsx` | Chips, selectores de cliente (`useClientInspection()` **sin página**) y operador (`useGetCatalogosUsuarios()`), los date pickers cuando el preset es `custom`, y los chips removibles de cliente y operador. **Aplica al cambiar**, sin botón Buscar. |
| `ProgressRing` | `components/metricas/ProgressRing.tsx` | Anillo SVG de 88 px con trazo de 8 px. La pista es `text-bg-app` con el inset aplicado sobre el contenedor redondo, y el arco va del color del tono. `value: number \| null`: con `null` muestra la pista vacía y "—" en el centro. |
| `IndicatorCard` | `components/metricas/IndicatorCard.tsx` | Tarjeta de un indicador: rótulo, `ProgressRing` o número grande, y línea de apoyo. |
| `DeviationGauge` | `components/metricas/DeviationGauge.tsx` | Pista horizontal centrada en 0, con una banda translúcida para μ ± σ y un marcador redondo en μ. La escala es simétrica: `±max(5, ceil((|μ| + σ) / 5) × 5)`, con **tope en ±50**. Si el valor se pasa del tope, el marcador queda en el borde con una flecha. Debajo, una frase: "Por encima del ideal" (warning), "Por debajo del ideal" (destructive) o "En el ideal" si `|μ| < 0,5`. Con `null`, "Sin datos para calcular la desviación". |
| `QualityStateBar` | `components/metricas/QualityStateBar.tsx` | Barra segmentada de 12 px sobre una pista hundida, con un segmento por estado con `total > 0`, y una leyenda de puntos con nombre, total y porcentaje. Los estados en cero salen en la leyenda y no en la barra. |
| `InlineBar` / `DivergingBar` | `components/metricas/InlineBars.tsx` | Mini barras de 6 px para las celdas de la tabla. La divergente escala contra el máximo `|desviación|` de las filas visibles, con el mismo tope de ±50. |
| `QualityMetricsDashboard` | `views/metricas/QualityMetricsDashboard.tsx` | Llama a `useQualityMetrics`, pinta el header con el período, las tarjetas, la desviación, los estados y la tabla. Si `total_pesajes === 0 && anulados === 0`, muestra un `EmptyState` ("Sin pesajes en este período") en lugar de todo lo que va debajo del header. |
| `ClientMetricsTable` | `views/metricas/ClientMetricsTable.tsx` | `DataTable` con `SectionCardHeader` ("Por cliente", ícono `Users`, badge con la cantidad de clientes). |

Columnas de `ClientMetricsTable`, todas con `enableSorting: true`. `defaultSorting` es `total_pesajes` desc, el mismo orden que manda el backend.

| Columna | Contenido | Alineación |
| --- | --- | --- |
| Cliente | `cliente`, o `Cliente #id` si viene `null` | izquierda |
| Pesajes | `total_pesajes` | derecha |
| Fuera de rango | `InlineBar` warning + `porcentaje_fuera_de_rango` | derecha |
| Desviación | `DivergingBar` + `desviacion_promedio_pct` con signo | derecha |
| Rechazo aprob. | `porcentaje_rechazo_aprobador` | derecha |
| Anulados | `anulados` | derecha |

`getRowId` es `cliente_id`. `onRowClick` aplica `cliente_id` a los filtros, y con eso el tablero entero pasa a mostrar ese cliente.

### Ruta — `src/routes/(portal)/_portal.metricas.tsx`

- Guarda los filtros en un `useState<QualityMetricsFilters>`, que arranca en `DEFAULT_QUALITY_METRICS_FILTERS`.
- **Cada cambio de filtro va en `startTransition`.** Cada combinación de filtros es una `queryKey` nueva, y sin la transición `useSuspenseQuery` cambiaría el tablero por un spinner en cada click de chip. Con la transición, el tablero anterior queda en pantalla con `opacity-60 transition-opacity` y `aria-busy` hasta que llega el nuevo. Es el mismo mecanismo que la paginación del SPEC 12.
- La primera carga sí suspende, con `LoadingState`.
- El tablero va dentro de su propio `ErrorBoundary` con "Reintentar" (`reset`). La barra de filtros queda **fuera** de él, para poder corregir un filtro sin perder la pantalla.

### Permiso — seed en la base del backend

Se hace a mano, como todos los permisos (`CLAUDE.md` del backend). Con el criterio de este spec, el rol es `ADMIN`:

```sql
INSERT INTO catalogo_permisos (codigo, nombre, descripcion)
VALUES ('VER-METRICAS', 'Ver métricas', 'Muestra el item Métricas y la pantalla /metricas (GET /metricas/calidad)');

INSERT INTO permisos (rol_id, permiso_id)
SELECT r.id, c.id FROM roles r JOIN catalogo_permisos c ON c.codigo = 'VER-METRICAS'
WHERE r.nombre = 'ADMIN';
```

Sin el seed, nadie ve el item, pero `/metricas` sigue funcionando para quien entre con la URL. Los permisos se leen en el login (SPEC 07), así que después del seed hay que **volver a ingresar** para ver el item.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/types/auth/permissions.ts` | `VERMETRICAS: 'VER-METRICAS'`. |
| `src/presentation/types/metricas/qualityMetrics.types.ts` | Nuevo. Tipos del contrato. |
| `src/presentation/hooks/metricas/qualityMetricsParams.ts` | Nuevo. Filtros, defaults y `buildQualityMetricsParams`. |
| `src/presentation/hooks/metricas/qualityMetricsParams.test.ts` | Nuevo. Tests del helper. |
| `src/presentation/hooks/metricas/useQualityMetrics.tsx` | Nuevo. |
| `src/styles.css` | Token `shadow-clay-inset` y su variante oscura. |
| `src/presentation/components/metricas/*` | Nuevos: `PeriodChips`, `ProgressRing`, `IndicatorCard`, `DeviationGauge`, `QualityStateBar`, `InlineBars`. |
| `src/presentation/views/metricas/*` | Nuevos: `MetricsFilterBar`, `QualityMetricsDashboard`, `ClientMetricsTable`. |
| `src/routes/(portal)/_portal.metricas.tsx` | Nuevo. |
| `src/presentation/components/shared/SideBar.tsx` | Item "Métricas" en `menuItems`, después de "Clientes". |
| `CLAUDE.md` | Sección del módulo. |

`routeTree.gen.ts` lo regenera el plugin y no se toca a mano.

---

## Plan de implementación

1. Agregar `VERMETRICAS` a `PERMISSIONS` y crear `qualityMetrics.types.ts`. `npx tsc --noEmit` pasa y nada cambia en pantalla.
2. Crear `qualityMetricsParams.ts` y su test. Casos del test (con `today` fijo, por ejemplo `2026-10-09` local):
   - `30d` da `{}`.
   - `7d` da `{ desde: '2026-10-03' }` y `90d` da `{ desde: '2026-07-12' }`.
   - `month` da `{ desde: '2026-10-01' }`.
   - `custom` con las dos fechas manda las dos, con solo `hasta` manda solo `hasta`, y sin fechas da `{}`.
   - `cliente_id` y `usuario_id` pasan, y `undefined` no genera la clave.
   - Ningún preset manda `hasta`.
3. Crear `useQualityMetrics`.
4. Agregar `shadow-clay-inset` a `styles.css` y crear los componentes de `components/metricas/` (`ProgressRing`, `IndicatorCard`, `DeviationGauge`, `QualityStateBar`, `InlineBars`, `PeriodChips`). Son puramente presentacionales y todavía no se montan en ningún lado.
5. Crear `ClientMetricsTable` y `QualityMetricsDashboard`, que todavía no se montan.
6. Crear `MetricsFilterBar`.
7. Crear la ruta `_portal.metricas.tsx`: filtros en `useState`, cambios en `startTransition`, `Suspense` con `LoadingState` y `ErrorBoundary` propio. Prueba manual: entrar por URL a `/metricas` contra el backend del SPEC 35.
8. Agregar el item "Métricas" en el `Sidebar`, después de "Clientes", con `permission: PERMISSIONS.VERMETRICAS` e ícono `ChartNoAxesCombined`. El `MobileNav` lo hereda porque comparte `SidebarContent`.
9. Correr el seed del permiso en la base del backend, volver a ingresar con un `ADMIN` y comprobar el item. Ingresar con un `OPERADOR` y comprobar que no lo ve.
10. Actualizar `CLAUDE.md` con una sección breve: el permiso que oculta un endpoint abierto, que el período se muestra desde la respuesta, que los presets no mandan `hasta`, que los filtros cambian en transición y que los gráficos están hechos a mano con `shadow-clay-inset` como pista.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` y `npm run test` pasan.
- [X] Con `VER-METRICAS`, el `Sidebar` (y el drawer móvil) muestra "Métricas" justo debajo de "Clientes", y queda marcado como activo en `/metricas`.
- [X] Sin `VER-METRICAS`, el item no aparece, pero `/metricas` escrito a mano carga igual.
- [X] Al entrar, el chip "30 días" está activo, la petición sale **sin** `desde` ni `hasta`, y el encabezado muestra el período que devolvió el backend.
- [X] "7 días", "90 días" y "Este mes" mandan solo `desde`, con la fecha local correcta, y nunca `hasta`.
- [X] "Personalizado" muestra los dos date pickers. Elegir fechas manda `desde`/`hasta` en `YYYY-MM-DD`.
- [X] Elegir un cliente o un operador manda `cliente_id` o `usuario_id`, y aparece su chip removible. Al quitar el chip, el filtro se borra.
- [X] Ninguna petición lleva un param vacío (`cliente_id=`, `desde=`).
- [X] Al cambiar un filtro, el tablero anterior queda visible y atenuado hasta que llega el nuevo, sin spinner. La primera carga sí muestra el `LoadingState`.
- [X] Las cuatro tarjetas muestran los valores del `resumen`. Los porcentajes llevan 2 decimales con coma, y un `null` se ve como "—", nunca como "0 %".
- [X] La desviación se muestra con signo, en `warning` si es positiva y en `destructive` si es negativa, con su frase debajo. El marcador del medidor coincide con el valor y la banda con ± σ.
- [X] Un valor de desviación mayor que 50 (como el cliente 9 en datos de prueba) deja el marcador en el borde y no rompe el layout.
- [X] La barra de estados muestra un segmento por estado con `total > 0`, y la leyenda lista **todos** los estados del catálogo, también los que están en cero.
- [X] La tabla por cliente muestra un cliente por fila, ordenada por pesajes de mayor a menor, y se puede reordenar por cada columna.
- [X] Al hacer click en una fila, todo el tablero se filtra por ese cliente y aparece el chip "Cliente: X ×".
- [X] Un período sin pesajes muestra el `EmptyState` y no muestra anillos en cero.
- [X] Un error del endpoint muestra el fallback del `ErrorBoundary` con "Reintentar", y la barra de filtros sigue funcionando.
- [X] En modo oscuro, ninguna tarjeta ni pista tiene un color fuera de los tokens, y el inset no se ve como un halo blanco.
- [X] Con `prefers-reduced-motion`, los anillos y las barras aparecen sin animar.
- [X] En un ancho de 375 px todo queda en una columna, los chips hacen scroll horizontal y la tabla scrollea dentro de su tarjeta.
- [X] No se agregó ninguna dependencia a `package.json`.

---

## Decisiones

- **Sí:** un permiso nuevo, `VER-METRICAS`, para el item. Decisión del usuario. El endpoint está abierto, pero mostrar el rendimiento de todos los operarios a cualquiera que entre a la báscula no es la intención.
- **No:** mostrarlo a todos, o reusar `MODULO-ADMINISTRACION`. El segundo ataría las métricas a otro módulo.
- **Sí:** el seed le da el permiso a `ADMIN`. Es el criterio de este spec. Si otro rol tiene que verlo, es una fila más en `permisos`, sin tocar código.
- **Sí:** el item va en `menuItems`, debajo de "Clientes". Decisión del usuario.
- **Sí:** gráficos hechos a mano con SVG y CSS. Decisión del usuario. Los datos son pocos y no hay series temporales, así que una librería sumaría peso y un look genérico contra el que habría que pelear para que quede clay.
- **Sí:** desglose por cliente en el `DataTable` con barras dentro de las celdas. Decisión del usuario. Escala con muchos clientes y reusa el orden de columnas que ya existe.
- **Sí:** presets en chips más un rango a mano. Decisión del usuario.
- **Sí:** "30 días" no manda fechas. Así el default es el del backend, y el período que se muestra coincide con el que se calculó.
- **Sí:** los presets mandan solo `desde`. `hasta` lo completa el backend con su `CURDATE()`. Si el navegador mandara su "hoy", de noche en Honduras el rango terminaría un día antes que los datos escritos con `NOW()` en UTC.
- **Sí:** el período del encabezado sale siempre de la respuesta. Nunca puede contradecir lo que se calculó.
- **Sí:** filtros por cliente y por operador. Decisión del usuario.
- **Sí:** click en una fila filtra por ese cliente. Decisión del usuario.
- **Sí:** los filtros se aplican al cambiar, sin botón "Buscar". En un tablero cada filtro es un click y la respuesta llega rápido. El botón solo agregaría un paso. Es distinto de `/historial`, donde se combinan varios campos de texto.
- **Sí:** cambios de filtro en `startTransition`. Sin eso cada chip haría parpadear la pantalla entera con un spinner.
- **Sí:** `ErrorBoundary` propio del tablero, con los filtros afuera. Un error no debe dejar al usuario sin poder cambiar el filtro que lo causó.
- **No:** acceso en la portada. Decisión del usuario.
- **No:** filtros en la URL. Se mantiene el criterio de `/historial`. Compartir un tablero filtrado por link es otro spec.
- **Sí:** tope de ±50% en la escala de desviación. Un `peso_ideal` mal cargado (hay un caso real en los datos de prueba, con 275%) aplastaría a todos los demás contra el centro.
- **Sí:** el color solo con significado: `warning` para lo que está por encima o fuera, `destructive` para lo que está por debajo o rechazado, y `brand` como único acento. Es la parte "minimalista" del pedido.
- **Sí:** un token `shadow-clay-inset` en lugar de sombras escritas a mano por componente. Las pistas hundidas son el rasgo clay de la pantalla, y en un solo lugar se puede ajustar para los dos temas.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El front se despliega antes que el backend del SPEC 35 | `/metricas` cae en el `ErrorBoundary` con un 404. El item solo aparece con el seed, que tiene sentido correr recién cuando el backend esté desplegado. |
| Se corre el seed y nadie vuelve a ingresar | Los permisos se cargan en el login (SPEC 07). Queda escrito en el paso 9 y en `CLAUDE.md`. |
| El endpoint está abierto y el item oculto da una falsa sensación de control | Está escrito en el "Por qué" y en `CLAUDE.md`. Cerrarlo es un cambio de una línea en el backend (`validateCallerEsAdmin`), en otro spec. |
| Un `peso_ideal` mal cargado distorsiona la desviación global y la del cliente | El tope de ±50 protege el dibujo, pero el número se muestra tal cual. Es un problema de datos, no de la pantalla. |
| Muchos clientes en un rango largo | El `DataTable` scrollea dentro de su tarjeta con `maxHeight`. El backend no pagina el desglose. |
| El backend agrega un estado de calidad con un `codigo` nuevo | Se pinta neutro, y la leyenda lo muestra con su `nombre`. No se rompe. |
| De noche, "Este mes" en el navegador ya es el mes siguiente que en MySQL, o al revés | El encabezado muestra el período real que calculó el backend, así que la diferencia se ve. Es el mismo desfase que tiene el default. |

---

## Lo que **no** entra en este spec

- Acceso desde la portada.
- Tendencia por día o series temporales.
- Desgloses por producto u operador.
- Los otros bloques de métricas del backend.
- Exportación.
- Filtros en la URL o persistidos.
- Refresco automático.
- Guard de permisos en la ruta.

Cada uno de estos, si se necesita, va en su propio spec.
