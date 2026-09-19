/**
 * El backend del chat todavía no existe. Mientras tanto Agri contesta desde
 * acá: una sola respuesta, siempre la misma, y una demora que simula lo que
 * tarda una IA en redactar.
 *
 * Cuando exista el endpoint, este archivo se borra y `useAgriChat` es lo único
 * que cambia.
 */

/** Lo que tarda Agri en "pensar" antes de contestar. */
export const DEMORA_RESPUESTA_MS = 1400

/**
 * Markdown de ejemplo. Habla del rubro para que la demo sea creíble, y ejercita
 * a propósito todo lo que `MarkdownContent` sabe pintar —títulos, párrafos,
 * lista numerada, negritas, tabla, cita y bloque de código—: es el banco de
 * pruebas de la tipografía del chat en los dos temas.
 */
export const RESPUESTA_DE_EJEMPLO = `## Cómo se lee un lote finalizado

Un lote queda **finalizado** cuando todos sus pesajes fueron registrados y ninguno
quedó pendiente de revisión. Desde ese momento el peso neto ya no cambia y el lote
puede entrar en un documento fiscal.

### Qué mirar primero

1. **Humedad promedio.** Por encima del máximo del parámetro, el lote se castiga
   en precio.
2. **Pesajes rechazados.** Uno solo alcanza para que el lote quede observado.
3. **Diferencia entre bruto y tara.** Si no cierra, casi siempre es una tara vieja
   del camión.

| Indicador     | Rango ideal | Fuera de rango              |
| ------------- | ----------- | --------------------------- |
| Humedad       | 11 % – 13 % | Reprocesar o ajustar precio |
| Impureza      | 0 % – 2 %   | Enviar a limpieza           |
| Grano dañado  | 0 % – 3 %   | Rechazar el pesaje          |

> Un lote con más del 5 % de pesajes rechazados no debería aprobarse sin la firma
> del supervisor.

El peso neto sale siempre de la misma cuenta:

\`\`\`txt
peso_neto = peso_bruto - tara
\`\`\`

¿Querés que revisemos un lote puntual?`
