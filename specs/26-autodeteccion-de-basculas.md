# SPEC 26 — Autodetección de básculas

> **Estado:** Approved
> **Depende de:** SPEC 01 (selector de báscula con dialog propio)
> **Fecha:** 2026-11-07
> **Objetivo:** Que al autorizar una báscula el sistema descubra solo cómo hablarle (velocidad, formato del byte, si transmite sola o hay que pedirle el peso, formato de la trama y unidad) y lo guarde como perfil, para que cualquier indicador funcione sin que nadie en planta configure nada.

---

## Por qué existe este spec

Hoy todo lo que cambia de una báscula a otra está fijo en el código:

- `useControlCalidad` abre el puerto a `BAUD_RATE = 9600`, 8N1, sin control de flujo.
- `parsearTrama` (`useSerialScale.tsx:87`) toma **el primer número** de cada línea.
- La unidad que manda la báscula no se lee: se asume la `unidad_medida` del lote.

Eso funciona con el indicador de la planta piloto y con pocos más. Con otros se rompe de formas distintas:

| Indicador | Qué pasa hoy |
| --- | --- |
| Configurado a 2400 o 4800 baud, o en 7E1 | Llegan bytes basura. No hay peso, y el operario no sabe por qué. |
| Chino tipo XK3190 en salida continua | Manda el número **invertido** (`=0.0510` es 105.0). Se lee un peso falso. |
| Mettler Toledo en salida continua | Trama de estado + 6 dígitos de peso + 6 de tara, sin punto decimal. Se lee un número de 12 dígitos. |
| Mettler SICS, Toledo en modo demanda | No transmite si no se le pide. El hook queda en "sin señal" para siempre. |
| Trama con bruto, tara y neto | Se toma el primero, que puede no ser el bruto. |
| Báscula en kg con lote en libras | Se guarda un pesaje en kg como si fueran libras. |

El cliente no sabe qué es un baud rate, y no se le puede pedir que lo configure. La solución es que el sistema lo descubra probando, con la báscula ya autorizada por el flujo del SPEC 01.

**Límite técnico:** Web Serial no expone fabricante, modelo ni número de serie. La única forma de saber cómo habla una báscula es abrir el puerto y escuchar (o preguntar). Por eso la detección tarda unos segundos y necesita la báscula encendida.

---

## Alcance

**Dentro:**

- Detección automática del perfil de comunicación en el `SelectorBasculaDialog`, después del alias de una báscula nueva, y al elegir una báscula autorizada que todavía no tiene perfil.
- Prueba de velocidades (1200, 2400, 4800, 9600, 19200, 38400) y formatos del byte (8N1, 7E1, 7O1).
- Reconocimiento de tres formatos de trama: texto (el de hoy), texto invertido (XK3190) y Toledo continuo.
- Básculas por demanda: si todas las combinaciones están mudas, se prueba una lista fija de comandos de consulta. Si uno contesta, el perfil queda en modo consulta y el hook pregunta el peso periódicamente.
- Lectura de la unidad que informa la trama (`kg`, `lb`, `g`, `oz`).
- **Bloqueo por unidad distinta:** si la báscula informa una unidad que no es la del lote, se deshabilita **Registrar pesaje** y se muestra un aviso. Si la trama no informa unidad, se asume la del lote, como hoy.
- Perfil por báscula en `localStorage` (`bascula-perfil:v1`), indexado por la misma `ClaveBascula` del SPEC 01.
- Re-detección: botón **Volver a detectar** en cada fila del dialog, y automática cuando llegan bytes pero ninguna trama válida durante 5 s.
- Si la detección falla: aviso al operario con **Reintentar** y **Configurar a mano**, con prueba de lectura.
- Tests de Vitest del parser, del puntaje de la detección, del hook de detección y de los cambios en `useSerialScale`.
- Manual de usuario, lista de capturas y `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- Conversión automática de unidades (kg ↔ lb). Se decidió bloquear, no convertir.
- Catálogo de perfiles en el backend, compartido entre equipos.
- Protocolos binarios fuera de Toledo continuo (Modbus, protocolos propietarios con checksum).
- Básculas por red (TCP/IP), Bluetooth o HID. Sólo Web Serial.
- Leer el indicador de estabilidad del equipo (`ST`/`US`) como parte del perfil. `usarFlagEstabilidad` sigue apagado.
- Distinguir dos adaptadores del mismo modelo (mismo `vendorId:productId`). Sigue el riesgo del SPEC 01.
- Cablear el selector o la detección en `/crear-pesaje` u otras pantallas.
- Pantalla de soporte para ver o borrar perfiles guardados.

---

## Modelo de datos

### Tipos nuevos — `src/presentation/types/control-calidad/perfil-bascula.types.ts`

```ts
export type ByteFormat = '8N1' | '7E1' | '7O1'
export type FrameFormat = 'texto' | 'invertido' | 'toledo-continuo'
export type FrameTerminator = '\r\n' | '\r' | '\n' | '\x03'
export type WeightUnit = 'kg' | 'lb' | 'g' | 'oz'
export type PollCommandId = 'sics' | 'toledo-p' | 'w' | 'enq'

export interface ScaleProfile {
    version: 1
    baudRate: number
    byteFormat: ByteFormat
    mode: 'continuo' | 'consulta'
    /** Sólo en modo consulta. */
    pollCommand: PollCommandId | null
    frameFormat: FrameFormat
    terminator: FrameTerminator
    /** Unidad vista en las tramas durante la detección. `null` si la trama no la informa. */
    unit: WeightUnit | null
    source: 'auto' | 'manual'
    /** ISO 8601. */
    detectedAt: string
}
```

### Catálogos fijos — `src/presentation/hooks/bascula/scaleDetection.ts`

```ts
export const DETECTION_BAUD_RATES = [9600, 2400, 4800, 19200, 1200, 38400] as const
export const DETECTION_BYTE_FORMATS: ByteFormat[] = ['8N1', '7E1', '7O1']

export const POLL_COMMANDS: Record<PollCommandId, string> = {
    sics: 'SI\r\n',
    'toledo-p': 'P',
    w: 'W\r',
    enq: '\x05',
}
```

`ByteFormat` se traduce a `dataBits` / `parity` / `stopBits` en un único helper (`toSerialOptions(profile)`), que es lo que recibe `port.open()`.

### Persistencia — `localStorage`

Una clave nueva, junto a las dos del SPEC 01:

```ts
// "bascula-perfil:v1"
{
  "0403:6001": { "version": 1, "baudRate": 2400, "byteFormat": "7E1", "mode": "continuo", "pollCommand": null,
                 "frameFormat": "texto", "terminator": "\r\n", "unit": "lb", "source": "auto",
                 "detectedAt": "2026-11-07T14:02:11.000Z" }
}
```

- Lectura validada entrada por entrada: un perfil con `version` distinta o un campo inválido se descarta, y esa báscula se trata como "sin perfil".
- Mismo `try/catch` y guarda de `typeof window` que `almacenamientoBasculas.ts`.
- **Báscula sin perfil** (autorizada antes de este spec, o perfil descartado): la auto-conexión al montar la abre con el **perfil por defecto** —9600, 8N1, continuo, texto, `\r\n`—, que es exactamente el comportamiento de hoy. Si llega basura, salta la re-detección automática.

### Cambios en `useSerialScale`

```ts
/** Cómo hablarle a la báscula. Sin la prop, se usan baudRate/dataBits/... y el parser de hoy. */
perfil?: ScaleProfile
/** Bytes recibidos sin ninguna trama válida durante `TRAMA_ILEGIBLE_MS` (5000). Una vez por conexión. */
onTramaIlegible?: () => void
```

Y el retorno suma `unidadLeida: WeightUnit | null`, la unidad de la última trama válida.

### Unidad del lote — `src/presentation/hooks/bascula/scaleUnits.ts`

`unitFromLote(unidad_medida)` traduce el texto del catálogo (`'LIBRAS'`, `'LB'`, `'KILOGRAMOS'`, `'KG'`, `'GRAMOS'`, `'ONZAS'`…) a `WeightUnit`, sin distinguir mayúsculas. Un texto desconocido devuelve `null`.

`isUnitMismatch(leida, lote)` es `true` sólo si **las dos** son distintas de `null` y no coinciden. Una unidad que no se reconoce no bloquea.

---

## Cómo detecta

Todo ocurre con el puerto ya autorizado y cerrado (el dialog sólo se abre con la báscula desconectada, regla del SPEC 01). La detección abre y cierra el puerto en cada combinación, con el mismo orden de cierre que `useSerialScale`: cancelar el reader → esperar el bucle → liberar el writer → `port.close()`.

1. **Escuchar (8N1).** Cada velocidad de `DETECTION_BAUD_RATES`, 1200 ms. Se guardan los bytes recibidos.
2. **Si llegó algo:** en las velocidades que recibieron bytes, se puntúa la muestra en 8N1 y se prueban 7E1 y 7O1. Se corta en cuanto una combinación supera `UMBRAL_CONFIANZA`. Si ninguna lo supera, gana la de mayor puntaje por encima de `UMBRAL_MINIMO`.
3. **Si todo estuvo mudo:** modo consulta. Velocidades 9600, 2400, 4800 y 19200, formatos 8N1 y 7E1. En cada una se manda cada comando de `POLL_COMMANDS` y se esperan 400 ms. Un comando gana si produce una trama válida **dos veces seguidas**.
4. **Tope total: 45 s.** Pasado ese tiempo, o si nada alcanza `UMBRAL_MINIMO`, la detección falla.

**El puntaje** (`scoreSample(bytes, byteFormat)`, puro):

- La muestra se corta en tramas probando los cuatro terminadores. Gana el que da más tramas.
- Cada trama se intenta leer con los tres formatos, en este orden:
  - `toledo-continuo`: `STX` + 3 bytes de estado + 6 dígitos de peso + 6 de tara. El punto decimal sale de los bits del byte de estado A; el signo y la unidad (lb/kg), del byte B.
  - `invertido`: empieza con `=` seguido de dígitos y punto; el número se lee al revés.
  - `texto`: el de hoy, más dos reglas:
    - si la trama trae una etiqueta de bruto (`G`, `GS`, `GROSS`, `B`), se toma el número que la acompaña;
    - si no, el primero.
- Hacen falta al menos **3 tramas válidas** del mismo formato. El puntaje combina la proporción de tramas válidas con la proporción de caracteres imprimibles.
- La unidad es el token `kg` / `lb` / `lbs` / `g` / `oz` de la trama, si aparece en la mayoría de las tramas válidas.

Con la plataforma vacía la detección funciona igual: un `0.00` repetido es una trama válida. No se le pide al operario que ponga peso.

---

## Flujo en el dialog

`useSelectorBascula` suma estos pasos al de la lista y al del alias del SPEC 01:

| Paso | Qué se ve | Acciones |
| --- | --- | --- |
| `detectando` | "Detectando la báscula…", barra de progreso y "Mantenga la báscula encendida." | **Cancelar** (vuelve a la lista sin guardar nada) |
| `resultado` | "Báscula reconocida", la última lectura con su unidad (o "Unidad no informada") | **Usar esta báscula** |
| `fallo` | "No se pudo reconocer la báscula. Revise que esté encendida y conectada, y llame a soporte si sigue igual." | **Reintentar** y **Configurar a mano** |
| `manual` | Formulario de perfil | **Probar**, **Guardar**, **Volver** |

- **Báscula nueva:** Autorizar → alias → `detectando` → `resultado` → **Usar esta báscula** guarda el perfil y la preferida, cierra el dialog y conecta.
- **Báscula de la lista sin perfil:** elegirla pasa directo a `detectando`.
- **Báscula con perfil:** se conecta como hoy, sin detectar.
- **Volver a detectar:** un botón chico en cada fila de la lista; pasa a `detectando` con esa báscula.
- **Configurar a mano** (`ManualScaleProfileForm`) pide velocidad, formato del byte, modo, comando (sólo en consulta) y formato de trama.
  - **Probar** escucha 3 s con esos valores y muestra las últimas tres líneas crudas y el peso leído.
  - **Guardar** sólo se habilita después de una prueba que leyó un peso. Guarda con `source: 'manual'`.

**Re-detección automática:** si `useSerialScale` dispara `onTramaIlegible`, `useControlCalidad`:

1. desconecta;
2. abre el dialog en `detectando` con la báscula preferida.

Ocurre **como mucho una vez por báscula por carga de pantalla**: si después de re-detectar vuelve a llegar basura, se muestra directamente el paso `fallo`. El silencio total **no** re-detecta: es báscula apagada o cable suelto, y sigue el "sin señal" de siempre.

---

## Plan de implementación

1. **Tipos.** Crear `perfil-bascula.types.ts` con el modelo de datos. Verificación: `npx tsc --noEmit`.

2. **Parser puro.** Crear `src/presentation/hooks/bascula/scaleFrameParser.ts`:
   - `splitFrames(texto, terminador)`;
   - `parseFrame(trama, frameFormat)` → `{ peso: number | null, unidad: WeightUnit | null }` para los tres formatos.

   El formato `texto` repite `parsearTrama` de hoy más la regla de la etiqueta de bruto. Crear `scaleFrameParser.test.ts` con tramas reales de cada formato: texto con y sin unidad, coma decimal, varios números con `GS`, invertido `=0.0510`, Toledo continuo con decimal implícito y signo negativo, y basura.

3. **Unidades.** Crear `scaleUnits.ts` con `unitFromLote` e `isUnitMismatch`, y sus casos en `scaleUnits.test.ts` (incluido un texto desconocido que no bloquea).

4. **Puntaje y catálogos.** Crear `scaleDetection.ts` con los catálogos, `toSerialOptions(profile)` y `scoreSample(bytes, byteFormat)` → `{ score, frameFormat, terminator, unit, lastWeight } | null`. Crear `scaleDetection.test.ts`:
   - una muestra buena de cada formato puntúa por encima de `UMBRAL_CONFIANZA`;
   - bytes al azar puntúan por debajo de `UMBRAL_MINIMO`;
   - una muestra con menos de 3 tramas devuelve `null`.

5. **Persistencia.** En `almacenamientoBasculas.ts`, agregar `readProfiles()`, `readProfile(clave)` y `saveProfile(clave, perfil)` sobre `bascula-perfil:v1`, con la validación por entrada. Casos nuevos en `useSelectorBascula.test.tsx` o en un test propio del módulo: perfil válido, versión distinta descartada, JSON corrupto.

6. **Hook de detección.** Crear `useScaleDetection.tsx`:
   - `detect(puerto): Promise<ScaleProfile | null>`, con las cuatro fases de "Cómo detecta";
   - `progress` (0 a 1) y `cancel()`.

   Crear `useScaleDetection.test.tsx` (`// @vitest-environment jsdom`), extendiendo el `PuertoFalso` de `useSerialScale.test.tsx`. El puerto falso responde sólo a una velocidad y formato dados, y opcionalmente sólo después de recibir un comando. Casos: continua a 2400 7E1, consulta SICS a 9600, muda en todo (devuelve `null`), cancelar a mitad (el puerto queda cerrado).

7. **`useSerialScale` con perfil.** Agregar las props `perfil` y `onTramaIlegible`, llevadas a `configRef`/`callbacksRef`:
   - con `perfil`, `port.open()` usa `toSerialOptions(perfil)` y el bucle parte con `splitFrames`/`parseFrame` del perfil;
   - en modo consulta, un writer manda `POLL_COMMANDS[perfil.pollCommand]` cada `INTERVALO_CONSULTA_MS` (250 ms), y se libera antes de `port.close()`;
   - se expone `unidadLeida`;
   - sin `perfil`, nada cambia.

   Casos nuevos en `useSerialScale.test.tsx`: el perfil en consulta escribe el comando, `onTramaIlegible` se dispara una vez con basura continua y no se dispara con silencio, y `unidadLeida` refleja la trama. Los casos existentes siguen en verde.

8. **Selector con detección.** En `useSelectorBascula.tsx`:
   - agregar los pasos `detectando` / `resultado` / `fallo` / `manual`;
   - `volverADetectar(clave)`, `usarResultado()`, `reintentar()`;
   - `onSeleccionar` pasa a recibir `(puerto, perfil)`;
   - `seleccionar(clave)` sin perfil pasa a `detectando`;
   - `resolverPerfilPreferido()` devuelve el perfil guardado o el perfil por defecto.

   Actualizar `useSelectorBascula.test.tsx`.

9. **UI del dialog.** En `SelectorBasculaDialog.tsx`, pintar los pasos de la tabla de "Flujo en el dialog" y el botón **Volver a detectar** por fila. Crear `components/control-calidad/ManualScaleProfileForm.tsx` con react-hook-form + zod y los `Controlled*`. Tokens semánticos de `styles.css`.

10. **`useControlCalidad`.**
    - Pasar a `useSerialScale` el `perfil` de la preferida, en un estado que se actualiza al seleccionar.
    - La auto-conexión al montar usa `resolverPerfilPreferido()`.
    - `onTramaIlegible` dispara la re-detección automática con su tope de una vez.
    - Calcular `unitMismatch = isUnitMismatch(scale.unidadLeida, unitFromLote(lote?.unidad_medida))` y devolverlo.
    - `solicitarTara` no hace nada con `unitMismatch`, y `mostrarBloqueo` exige `!unitMismatch`.
    - Quitar `BAUD_RATE`: la velocidad sale del perfil.

11. **Pantalla.**
    - En `MonitoreoBasculaCard`, con `unitMismatch`, deshabilitar **Registrar pesaje** y mostrar el aviso "La báscula pesa en {kg} y el lote está en {libras}. Cambie la unidad en la báscula o elija otro lote.", sin mover la grilla.
    - `ScaleConnectedDialog` toma `baudRate` del perfil.
    - Cablear todo en `_portal.control-calidad.tsx`.

12. **Manual** (`docs/manual/MANUAL.md`):
    - en el capítulo del operador, reescribir la conexión de la báscula con el paso "Detectando la báscula…";
    - agregar el aviso de unidad distinta;
    - en solución de problemas, "No se pudo reconocer la báscula" y "La báscula pesa en otra unidad";
    - en el capítulo del operador, **Configurar a mano**, sin jerga (velocidad y formato se explican como "los datos que figuran en el manual de la báscula");
    - una línea en **Sin publicar**.

    En `docs/manual/README.md`, las capturas del selector de báscula y de la tarjeta de monitoreo pasan a **Rehacer**.

13. **`CLAUDE.md`.** En la sección Báscula:
    - perfil por báscula y su clave;
    - las fases de la detección y sus topes;
    - las tres reglas del bloqueo por unidad;
    - la re-detección automática con su tope;
    - el perfil por defecto para básculas sin perfil.

---

## Criterios de aceptación

- [X] `npx tsc --noEmit` y `npm run test` pasan, con los tests nuevos de `scaleFrameParser`, `scaleUnits`, `scaleDetection` y `useScaleDetection`.
- [X] Autorizar una báscula nueva y ponerle alias pasa a "Detectando la báscula…" sin ningún paso más.
- [X] Con un indicador configurado a 2400 baud (o cualquier velocidad de la lista distinta de 9600), la detección termina en "Báscula reconocida" y, al usarla, el peso en `/control-calidad` coincide con el display del indicador.
- [X] Con un indicador en 7E1, lo mismo.
- [X] Con una báscula que manda tramas invertidas (`=0.0510`), el peso que se pinta es el del display (105.0), no 0.051.
- [X] Con una báscula Toledo en salida continua, el peso que se pinta es el del display, con su punto decimal.
- [X] Con una báscula que sólo contesta a un comando (por ejemplo SICS `SI`), la detección termina en modo consulta y el peso se actualiza en pantalla sin tocar nada.
- [X] La detección con la plataforma vacía reconoce la báscula.
- [X] Con la báscula apagada, la detección termina en el paso de fallo en 45 s como mucho, con **Reintentar**.
- [X] **Cancelar** durante la detección vuelve a la lista, no guarda perfil y deja el puerto cerrado: elegir la báscula de nuevo no falla con "port is already open".
- [X] En el paso de fallo, cualquier usuario ve **Configurar a mano**; **Probar** muestra las líneas crudas, y **Guardar** queda deshabilitado hasta una prueba con peso.
- [X] Recargar `/control-calidad` con una báscula que ya tiene perfil la conecta sola, sin detectar ni abrir el dialog.
- [X] Una báscula autorizada antes de este spec, a 9600 8N1, sigue conectándose sola al recargar, como antes.
- [X] Cambiar la velocidad del indicador con la báscula conectada dispara, a los ~5 s, la desconexión y el dialog en "Detectando la báscula…". Al terminar, el peso vuelve.
- [X] Si la re-detección automática no resuelve la basura, la segunda vez aparece el paso de fallo y no se vuelve a detectar en bucle.
- [X] Desenchufar el cable de datos con el puerto abierto muestra "sin señal" como hoy y **no** dispara la re-detección.
- [X] Con una báscula que informa `kg` y un lote en `LIBRAS`, **Registrar pesaje** está deshabilitado, aparece el aviso de unidad, y una muestra estable no abre ni la tara ni el `BloqueoCriticoDialog`.
- [X] Con una báscula que no informa unidad, un lote en `LIBRAS` permite registrar como hoy.
- [X] **Volver a detectar** en una fila de la lista corre la detección y reemplaza el perfil guardado.
- [X] Los perfiles sobreviven al cierre del navegador (`bascula-perfil:v1` en `localStorage`).
- [X] El manual tiene las secciones nuevas y la línea en **Sin publicar**, y el README marca las capturas como **Rehacer**.

---

## Decisiones

- **Sí:** detectar puerto **y** trama. Sólo con la velocidad, el parser de "el primer número" sigue leyendo mal las básculas invertidas, las Toledo y las que mandan bruto, tara y neto.
- **Sí:** cubrir básculas por demanda con una lista corta de comandos conocidos. Una báscula muda es indistinguible de una apagada si no se le pregunta. La lista vive en un solo objeto y se amplía sin tocar la lógica.
- **No:** mandar comandos antes de haber escuchado. Algunos indicadores continuos interpretan un byte suelto como orden (tara, cero). Por eso se pregunta sólo si todo estuvo mudo.
- **Sí:** bloquear ante una unidad distinta. Decisión explícita del usuario. Un pesaje en kg guardado como libras es un error de calidad que nadie ve hasta el reclamo.
- **No:** convertir kg ↔ lb automáticamente. Esconde una báscula mal configurada, y el redondeo del indicador en una unidad no es el de la otra.
- **Sí:** sin unidad en la trama, se asume la del lote. Muchas básculas sólo mandan el número; bloquearlas dejaría fuera la mayoría.
- **No:** preguntarle al operario la unidad al detectar. Agrega un paso que puede contestar mal, y una respuesta mal dada es peor que no saberla.
- **Sí:** una unidad de lote que no se reconoce no bloquea. Un texto nuevo en el catálogo no puede frenar la planta.
- **Sí:** perfil en `localStorage` por `ClaveBascula`, al lado del alias. Cada equipo detecta una vez, sin backend.
- **No:** catálogo de perfiles en el backend. Exige un spec allá primero, y la detección local ya resuelve el problema.
- **Sí:** la detección corre en el dialog, como un paso visible. Si falla, el operario lo ve en el momento y en el lugar donde puede hacer algo.
- **No:** detectar en segundo plano al conectar. Un fallo quedaría como un header en "sin señal" sin explicación.
- **Sí:** re-detección automática sólo ante bytes sin trama válida, y como mucho una vez por báscula por carga. La basura indica configuración equivocada; el silencio, no. El tope evita un bucle si el indicador manda algo que ningún formato entiende.
- **Sí:** báscula sin perfil se conecta con el perfil por defecto (9600 8N1 texto). Es el comportamiento de hoy: las básculas que ya funcionan no pasan por una detección que no necesitan.
- **Sí:** **Configurar a mano** visible para cualquier usuario, sin restricción por rol, con prueba obligatoria antes de guardar. Es la salida para un indicador raro, y la prueba impide guardar un perfil que no lee peso.
- **No:** leer `ST`/`US` como parte del perfil. Hay indicadores que mandan `US` siempre (ya documentado en `useSerialScale`). La ventana de estabilización del front sigue mandando.
- **Sí:** el parser y el puntaje son módulos puros, con tests propios. `useSerialScale` tiene el test más delicado del repo; se le agrega lo mínimo y su comportamiento sin `perfil` no cambia.
- **Sí:** orden de velocidades con 9600 primero. Es la más común: en la mayoría de los casos la detección corta en el primer segundo.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un comando de consulta hace que un indicador ejecute otra cosa (tara, cero). | Los comandos se mandan sólo si la báscula estuvo muda en todas las velocidades, y la lista son comandos de lectura documentados. |
| La detección toma una combinación equivocada que igual produce números (falso positivo). | Hacen falta 3 tramas válidas del mismo formato y terminador, más una proporción alta de imprimibles. El paso `resultado` muestra la lectura para que el operario la compare con el display antes de usarla. |
| La detección tarda demasiado y el operario cierra el dialog. | Tope de 45 s, 9600 primero, y corte en cuanto una combinación supera `UMBRAL_CONFIANZA`. Cerrar equivale a **Cancelar**: puerto cerrado, nada guardado. |
| Abrir y cerrar el puerto muchas veces deja un lock colgado. | Mismo orden de cierre que `useSerialScale`, en un solo helper, con un caso de test que cancela a mitad y vuelve a abrir. |
| Dos básculas del mismo modelo comparten clave y, por lo tanto, perfil. | Si están configuradas distinto, la re-detección automática corrige el perfil al conectar la otra. Es el mismo límite del SPEC 01. |
| La re-detección automática salta en medio de un pesaje. | Sólo ocurre con basura continua durante 5 s, cuando ya no hay lectura válida que perder. Con la tara o el ticket abiertos, se espera a que se cierren antes de abrir el dialog. |
| El catálogo de unidades del backend usa un texto que `unitFromLote` no conoce. | Devuelve `null` y no bloquea. Se agrega el texto en un solo lugar. |
| `localStorage` no disponible. | Cada conexión arranca sin perfil, con el de defecto, y la re-detección cubre el resto. Nada se rompe. |

---

## Lo que **no** entra en este spec

- Conversión automática de unidades.
- Perfiles en el backend.
- Protocolos binarios distintos de Toledo continuo.
- Básculas por red, Bluetooth o HID.
- Indicador de estabilidad del equipo en el perfil.
- Distinguir dos adaptadores del mismo modelo.
- La detección en otras pantallas.
- Pantalla para ver o borrar perfiles.

Cada uno de ellos, si se hace, va en su propio spec.
