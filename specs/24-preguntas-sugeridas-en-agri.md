# SPEC 24 — Preguntas sugeridas en Agri

> **Estado:** Implemented
> **Depende de:** SPEC 10 (Agri, chat IA), SPEC 48 del backend (`core-control-calidad-agro-backend/specs/48-preguntas-sugeridas-en-el-chat.md`), implementado en la rama `spec-48-preguntas-sugeridas-en-el-chat` del backend y **todavía sin mergear**
> **Fecha:** 2026-10-23
> **Objetivo:** Pintar como botones, debajo de la respuesta de Agri, las preguntas que `POST /chat` devuelve en `sugerencias` cuando no entendió la pregunta, y mandar la que se toque como el siguiente mensaje.

---

## Por qué existe este spec

Cuando una pregunta habla del sistema pero es vaga ("cómo va lo de Agroexport", "dame lo del aprobador"), Agri adivinaba qué consultar o contestaba que no tenía cómo responder. El SPEC 48 del backend lo cambió. Ahora, en ese caso, `POST /chat` devuelve:

- una frase fija en `respuesta`: *"No me quedo del todo claro que quieres ver. Elige una de estas preguntas o escribela con tus palabras."*;
- de 2 a 3 preguntas concretas en un campo nuevo, `sugerencias`.

En un turno normal, `sugerencias` llega vacío.

Hoy el front ignora ese campo: el usuario vería la frase invitándolo a elegir, pero sin nada que elegir. Este spec pinta las preguntas como botones. El diseño es la **opción B** de la maqueta que se aprobó: cápsulas con borde del acento de Agri, debajo del mensaje; al tocar una, se envía como si el usuario la hubiera escrito.

---

## Alcance

**Entra:**

- `sugerencias` en `AgriChatResponse`, y `suggestions` en `AgriMessage`.
- `useAgriChat` guarda las sugerencias en el mensaje de Agri que las trajo.
- Un componente nuevo, `AgriSuggestionChips` (`components/agri/`), que pinta una cápsula por pregunta.
- `AgriChatView` lo monta dentro de la burbuja de Agri, encima de **Copiar** y **Regenerar**.
- El historial manda ese turno con las preguntas en el formato del backend, para que el usuario también pueda escribir "la segunda".
- El armado del historial pasa a un archivo propio con tests.
- El manual (sección 5.3) y una línea en **Sin publicar**.
- El `CLAUDE.md` de la sección Agri.

**Fuera de alcance (para futuros specs):**

- Cambiar las sugerencias de la pantalla vacía (`GET /chat/sugerencias`). Siguen como están, en su grilla de tarjetas.
- Sugerencias de seguimiento después de una respuesta con datos. El backend no las manda.
- Botones para elegir entre personas o clientes con el mismo nombre. El backend todavía los lista en el texto de la respuesta.
- Registrar qué sugerencia tocó el usuario.
- Recordar el hilo al recargar. Sigue sin persistencia (SPEC 10).

---

## Modelo de datos

### Respuesta de `POST /chat`

`AgriChatResponse` (`src/presentation/types/agri/agri.types.ts`) gana:

```ts
/**
 * SPEC 48 del backend. Preguntas en texto plano, sin markdown. Vacío en un
 * turno normal; con 2 o 3 cuando Agri no entendió, y entonces `respuesta` es
 * la frase fija que invita a elegir. Opcional mientras haya backends sin el
 * SPEC 48: la ausencia se lee como `[]`.
 */
sugerencias?: string[]
```

### Mensaje del hilo

`AgriMessage` gana:

```ts
/**
 * Las preguntas que trajo esta respuesta de Agri. Sólo en mensajes de Agri, y
 * sólo si el backend mandó alguna: un mensaje sin sugerencias no lleva la clave.
 */
suggestions?: string[]
```

`content` sigue siendo solo `respuesta`. Las preguntas no se mezclan en el markdown: se pintan aparte, como botones.

### Historial

El backend pide que ese turno viaje en `historial` como la frase, una línea en blanco y una línea `- pregunta` por sugerencia. Es el mismo texto que guarda en su log, y lo que permite que el modelo entienda "la segunda". Para mensajes sin sugerencias, el `contenido` no cambia.

```
No me quedo del todo claro que quieres ver. Elige una de estas preguntas o escribela con tus palabras.

- ¿Qué lotes de Agroexport están abiertos?
- ¿Qué se pesó hoy de Agroexport?
```

`aHistorial` y su helper salen de `useAgriChat.tsx` a `src/presentation/hooks/agri/agriHistory.ts`:

- `withSuggestions(content: string, suggestions?: string[]): string` — devuelve `content` intacto si no hay sugerencias; si hay, le agrega `\n\n` y una línea `- ` por pregunta.
- `aHistorial(mensajes)` — igual que hoy (roles, recorte a 4000, filtra vacíos, últimos 10), pero el `contenido` de un mensaje de Agri sale de `withSuggestions(content, suggestions)`.

Las constantes `MAXIMO_DEL_TURNO` y `TURNOS_DE_HISTORIAL` se mudan con `aHistorial`. El recorte a 4000 se aplica después de agregar las preguntas. En la práctica nunca corta: la frase más tres preguntas de 150 caracteres no llegan a 600.

### Componente

`AgriSuggestionChips` (`src/presentation/components/agri/AgriSuggestionChips.tsx`):

```ts
interface AgriSuggestionChipsProps {
    suggestions: string[]
    /** Sólo la última respuesta, y sin un turno en vuelo, tiene las cápsulas activas. */
    disabled: boolean
    onSelect: (suggestion: string) => void
}
```

La forma visual es la opción B de la maqueta:

- **Contenedor:** `flex flex-wrap gap-2`, alineado a la izquierda bajo el texto de Agri.
- **Cada cápsula es un `<button type="button">`:**
  - forma: `rounded-full`, `px-3.5 py-1.5`, `text-left text-sm font-semibold`;
  - color: borde `border-agri-to/50`, texto `text-agri-to`, fondo `bg-surface`;
  - hover: `hover:bg-agri-to/10`; foco: el mismo anillo del resto de `/agri`, `focus-visible:ring-2 focus-visible:ring-agri-to/40`.
- **Deshabilitada:** `disabled:opacity-45 disabled:cursor-default`, y sin el fondo del hover.
- **Aparición:** `animate-in fade-in slide-in-from-bottom-1` escalonada por cápsula, igual que las tarjetas de la bienvenida. Sin animación con `prefers-reduced-motion` (`motion-reduce:animate-none`).
- **Texto:** el de la pregunta, tal cual, sin `MarkdownContent`.
- **`key`:** la pregunta misma. El backend ya las manda sin repetir.

### Comportamiento en la vista

- Las cápsulas se pintan en **toda** respuesta de Agri que trajo sugerencias, no solo en la última. Así el hilo sigue mostrando qué se ofreció.
- Solo están **activas** en la última respuesta y con `isThinking === false`. En las anteriores quedan visibles y deshabilitadas.
- Tocar una llama a `sendMessage(pregunta)`, el mismo camino que el compositor y las sugerencias de la bienvenida. Aparece como un globo del usuario con la pregunta completa.
- Escribir en el compositor en lugar de tocar también deja las cápsulas de esa respuesta deshabilitadas, porque deja de ser la última.
- El orden dentro de la burbuja es texto, cápsulas y barra de **Copiar** / **Regenerar**.
- **Copiar** copia solo `content`, la frase, como hoy.
- **Regenerar** sobre una respuesta con sugerencias funciona como siempre: descarta esa respuesta, con sus cápsulas, y vuelve a preguntar.

### Archivos

| Archivo | Cambio |
| --- | --- |
| `src/presentation/types/agri/agri.types.ts` | `sugerencias?` en `AgriChatResponse`; `suggestions?` en `AgriMessage`. |
| `src/presentation/hooks/agri/agriHistory.ts` | Nuevo: `withSuggestions`, `aHistorial` y sus dos constantes. |
| `src/presentation/hooks/agri/agriHistory.test.ts` | Nuevo: tests de los dos helpers. |
| `src/presentation/hooks/agri/useAgriChat.tsx` | Importa `aHistorial`; el `onSuccess` guarda `suggestions` en el mensaje de Agri. |
| `src/presentation/components/agri/AgriSuggestionChips.tsx` | Nuevo componente. |
| `src/presentation/views/agri/AgriChatView.tsx` | Monta `AgriSuggestionChips` dentro de la burbuja de Agri. |
| `docs/manual/MANUAL.md` | Sección 5.3 y línea en **Sin publicar**. |
| `CLAUDE.md` | Sección **Agri (chat IA)**. |

---

## Plan de implementación

1. Agregar `sugerencias?` a `AgriChatResponse` y `suggestions?` a `AgriMessage`. Todavía nadie los usa. Verificación: `npx tsc --noEmit` sin errores.
2. Crear `agriHistory.ts` con `withSuggestions` y `aHistorial`, moviendo las dos constantes desde `useAgriChat.tsx`. Hacer que `useAgriChat` lo importe y borrar la copia local. Crear `agriHistory.test.ts`. Verificación: `npx vitest run src/presentation/hooks/agri/agriHistory.test.ts` pasa y el chat manda el mismo historial que antes.
3. En el `onSuccess` de `preguntar`, crear el mensaje de Agri con `suggestions` cuando `sugerencias?.length` es mayor que cero, y sin la clave cuando no. Verificación: `npx tsc --noEmit` sin errores; contra el backend del SPEC 48, un turno con sugerencias deja el mensaje con `suggestions` (React DevTools) y el siguiente envío las lleva en `historial`.
4. Crear `AgriSuggestionChips` y montarlo en `AgriChatView` dentro de la burbuja de Agri, encima de `ResponseActions`, con `disabled` según la regla de la vista. Prueba manual en claro y en oscuro, en escritorio y en el ancho de un teléfono.
5. Actualizar el manual (`docs/manual/MANUAL.md`, sección 5.3):
   - Después del paso 4, un párrafo: "Si Agri no entiende del todo su pregunta, le propone dos o tres preguntas más concretas debajo de su respuesta. Pulse la que busca y se envía sola. También puede escribir la suya, o contestar, por ejemplo, *la segunda*."
   - La captura `5-3-agri.png` sigue en **Pendiente**: no hay nada que rehacer.
   - Una línea en el bloque **Sin publicar** del historial de versiones.
6. Actualizar la sección **Agri (chat IA)** del `CLAUDE.md`:
   - el campo `sugerencias` de `POST /chat` y su diferencia con `GET /chat/sugerencias`;
   - el formato del historial y dónde vive `aHistorial`;
   - la regla de cápsulas activas solo en la última respuesta.

---

## Criterios de aceptación

**Automáticos (`agriHistory.test.ts`):**

- [X] `withSuggestions('Hola', undefined)` y `withSuggestions('Hola', [])` devuelven `'Hola'`.
- [X] `withSuggestions('Frase', ['A?', 'B?'])` devuelve `'Frase\n\n- A?\n- B?'`.
- [X] `aHistorial` manda un mensaje de Agri con sugerencias como `rol: 'asistente'` y el `contenido` armado por `withSuggestions`.
- [X] `aHistorial` manda los mensajes del usuario y los de Agri sin sugerencias igual que antes.
- [X] `aHistorial` sigue mandando solo los últimos 10 turnos y recortando cada `contenido` a 4000 caracteres.
- [X] `npx tsc --noEmit` no da errores y `npm run test` pasa.

**Manuales, contra un backend con el SPEC 48 y con un cliente real en lugar de `<cliente>`:**

- [X] Preguntar "como va lo de `<cliente>`" muestra la frase fija y, debajo, de 2 a 3 cápsulas con preguntas que nombran a `<cliente>`.
- [X] Las cápsulas tienen borde y texto del acento de Agri, forma de píldora, y se acomodan en varias filas en el ancho de un teléfono sin scroll horizontal.
- [X] Tocar una cápsula agrega un globo del usuario con esa pregunta completa, muestra los tres puntos y luego la respuesta con datos.
- [X] Después de tocar una, las cápsulas de esa respuesta siguen visibles pero deshabilitadas y no responden al click.
- [X] Mientras Agri está pensando, las cápsulas de la última respuesta están deshabilitadas.
- [X] Escribir "la segunda" en el compositor, en lugar de tocar, responde la segunda pregunta sugerida.
- [X] Una pregunta clara ("que se peso hoy de `<cliente>`") responde sin cápsulas.
- [X] **Regenerar** sobre una respuesta con cápsulas la reemplaza, y las cápsulas viejas desaparecen.
- [X] **Copiar** sobre esa respuesta copia solo la frase.
- [X] Las cápsulas se navegan con Tab y se activan con Enter, con el anillo de foco visible.
- [X] Contra un backend **sin** el SPEC 48, el chat responde igual que hoy, sin cápsulas y sin errores en consola.
- [X] La pantalla vacía sigue mostrando sus sugerencias de siempre, en tarjetas.
- [X] El manual tiene el párrafo nuevo en la sección 5.3 y una línea en **Sin publicar**.

---

## Decisiones

- **Sí:** cápsulas debajo de la respuesta, la opción B de la maqueta. Decisión del usuario. **No:** la opción A, preguntas en viñetas dentro del markdown, que obligaba a copiar o reescribir la pregunta.
- **Sí:** tocar una cápsula llama a `sendMessage` con el texto tal cual. Es el mismo camino que el compositor y las sugerencias de la bienvenida: corta los 500 caracteres, respeta `isThinking` y aparece como globo del usuario. **No:** un envío aparte que no deje rastro en el hilo, que ocultaría qué se preguntó.
- **Sí:** las cápsulas quedan visibles y deshabilitadas en las respuestas anteriores. El hilo muestra qué se ofreció, y en la maqueta las ya usadas quedaban atenuadas. **No:** borrarlas al usarlas, que hace saltar el hilo hacia arriba.
- **Sí:** las preguntas viajan en `historial` con el formato del backend. Sin eso, "la segunda" no se puede resolver. **No:** mandarlas en `content`, que las pintaría en el markdown y las duplicaría con las cápsulas.
- **Sí:** `sugerencias` opcional en el tipo, con la ausencia leída como `[]`. El front puede salir antes que el backend sin romper el chat. **No:** obligatorio, que dejaría `undefined.length` en un backend viejo.
- **Sí:** el acento `agri-to` para las cápsulas. Es el acento propio de esta pantalla. **No:** los tokens generales (`border-border-ui`), que las harían parecer tarjetas de la bienvenida y no una acción de la respuesta.
- **Sí:** `aHistorial` sale a `agriHistory.ts` para testearlo. Es lógica pura, como `plantTour.ts` y `qualityMetricsParams.ts`, que tienen sus tests al lado. **No:** testear el hook entero, que no tiene tests hoy y no los necesita para esto.
- **Sí:** nombres nuevos en inglés (`AgriSuggestionChips`, `withSuggestions`, `suggestions`), según la regla del `CLAUDE.md`. `aHistorial` conserva su nombre porque ya existía.
- **No:** tocar las sugerencias de la pantalla vacía. Son otro endpoint, con otra forma, y funcionan.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se mergea el front antes que el SPEC 48 del backend | `sugerencias` es opcional y la ausencia se lee como `[]`: el chat se comporta como hoy. Un criterio manual lo comprueba. |
| El backend devuelve una pregunta larga y la cápsula rompe el ancho | El backend las corta en 150 caracteres. La cápsula usa `text-left` y el contenedor `flex-wrap`, así que una larga ocupa su propia fila y hace salto de línea adentro. |
| El texto de la pregunta trae algo que parece HTML o markdown | Se pinta como texto de React, sin `MarkdownContent`: no se interpreta. El backend además descarta las que traen etiquetas. |
| El usuario toca una cápsula de una respuesta vieja | Están deshabilitadas fuera de la última respuesta. |
| Las cápsulas aparecen antes de que termine la animación palabra por palabra del texto | Se acepta. La animación de entrada propia las hace aparecer suave, y esperar a que termine el texto exigiría que `MarkdownContent` avise cuándo acaba. |
| El backend cambia el formato del historial | El formato vive en un solo helper, `withSuggestions`, con test. Si el backend lo cambia, se cambia ahí. |

---

## Lo que **no** entra en este spec

- Cambios en las sugerencias de la pantalla vacía.
- Sugerencias de seguimiento después de una respuesta con datos.
- Botones para elegir entre nombres que coinciden.
- Registro de qué sugerencia se tocó.
- Persistencia del hilo.

Cada uno de estos, si hace falta, va en su propio spec.
