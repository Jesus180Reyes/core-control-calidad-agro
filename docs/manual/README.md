# Manual de usuario — guía para el equipo

Este README es para quien mantiene el manual, no para el cliente. El manual que se entrega es [`MANUAL.md`](MANUAL.md), exportado a PDF. Las reglas de fondo están en `specs/17-manual-de-usuario.md`.

## Qué hay en esta carpeta

| Archivo | Contenido |
| --- | --- |
| `MANUAL.md` | El manual completo, en un solo archivo. |
| `capturas/*.png` | Las capturas que referencia el manual. |
| `README.md` | Este archivo. |
| `.gitignore` | Ignora `*.pdf`: el PDF no se versiona. |

## Exportar a PDF

Se exporta a mano, siempre con la misma herramienta, para que el PDF salga igual sin importar quién lo genere.

1. Instalar en VS Code la extensión **Markdown PDF** (`yzane.markdown-pdf`).
2. Abrir `docs/manual/MANUAL.md`.
3. Abrir la paleta de comandos (`Ctrl+Shift+P`) y ejecutar **Markdown PDF: Export (pdf)**.
4. El PDF queda en `docs/manual/MANUAL.pdf`. Git lo ignora.

Antes de mandarlo, revisar el PDF:

- [ ] Se ven todas las imágenes, ninguna rota.
- [ ] La portada tiene la versión y la fecha de esta entrega.
- [ ] Ninguna captura muestra un cliente, un RTN o un usuario reales.
- [ ] Se agregó el contacto de soporte de esta entrega. No se guarda en el repo: se agrega sobre el PDF o en el correo de entrega.

### Saltos de página

Markdown PDF respeta este bloque, que fuerza una página nueva:

```html
<div style="page-break-after: always"></div>
```

Va después de la portada, del índice y al final de cada capítulo.

### Enlaces del índice

Cada sección enlazada desde el índice lleva un ancla explícita en la línea anterior a su título:

```markdown
<a id="cap-4-1"></a>

### 4.1 Registrar un pesaje
```

El id es `cap-` más el número de la sección con guiones (`cap-4`, `cap-4-1`, `cap-anexo-a`). No hay que depender de las anclas que genera cada visor a partir del título: los acentos y los números las vuelven distintas entre VS Code, GitHub y Markdown PDF.

## Capturas

Se toman a mano. Reglas:

- En escritorio, con la ventana a **1440 × 900**, en **Chrome** y con el **tema claro**.
- Siempre con **datos de demo**: clientes, lotes y usuarios ficticios. Nunca un nombre de cliente real, un RTN real ni el nombre de un usuario real en la barra lateral.
- Se guardan en `capturas/` en PNG, con el nombre exacto de la lista de abajo.
- El nombre sigue el patrón `<sección>-<pantalla>-<estado>.png`, en kebab-case.
- En el manual van con ruta relativa y un pie en cursiva debajo:

  ```markdown
  ![Báscula con peso estable](capturas/4-1-bascula-estable.png)

  *La báscula con un peso estable dentro del rango.*
  ```

### Lista de capturas

Esta lista es el checklist de quien toma las capturas. Si un cambio modifica una pantalla capturada, se marca **Rehacer** en su fila, en el mismo cambio.

| Archivo | Qué tiene que verse | Estado |
| --- | --- | --- |
| `3-1-login.png` | La pantalla de ingreso. | Pendiente |
| `3-2-password-vencida.png` | El diálogo de renovación con su checklist de reglas. | Pendiente |
| `3-3-portada.png` | La portada con el menú lateral de un `ADMIN`. | Pendiente |
| `3-4-ajustes.png` | Ajustes: perfil, apariencia y sesión. | Pendiente |
| `4-1-seleccion-cliente.png` | La grilla de clientes de **Registrar Pesaje**. | Pendiente |
| `4-1-seleccion-lote.png` | Los lotes del cliente elegido. | Pendiente |
| `4-1-bascula-conectar.png` | La báscula antes de conectar, con el selector de puerto. | Pendiente |
| `4-1-bascula-estable.png` | Un peso estable dentro del rango. | Pendiente |
| `4-1-tara.png` | El diálogo de tara. | Pendiente |
| `4-3-bloqueo-critico.png` | El Bloqueo Crítico pidiendo el PIN. | Pendiente |
| `4-3-tara-autorizada.png` | La tara con "Autorizado por …". | Pendiente |
| `4-4-ticket.png` | El modal **Imprimir ticket**. | Pendiente |
| `4-5-crear-cliente.png` | El formulario de cliente nuevo. | Pendiente |
| `4-5-crear-lote.png` | El formulario de lote nuevo. | Pendiente |
| `4-6-inspeccion-clientes.png` | La tabla paginada de inspección de clientes. | Pendiente |
| `4-6-inspeccion-pesajes.png` | Los pesajes de un lote. | Pendiente |
| `4-8-historial.png` | El historial con filtros. | Pendiente |
| `5-3-agri.png` | Agri con una pregunta y su respuesta. | Pendiente |
| `5-4-mirador.png` | El Mirador con un lote seleccionado. | Pendiente |
| `5-5-metricas.png` | El tablero de métricas. | Pendiente |

## Versiones

- La portada dice `Versión X.Y · <fecha>`. La primera entrega es la `1.0`.
- Al final del manual, "Historial de versiones" tiene un bloque **Sin publicar** arriba de todo. Cada cambio que actualiza el manual agrega una línea ahí.
- Al entregar:
  1. Comparar el anexo A con la tabla `permisos` de la base **de producción** y corregirlo si difiere.
  2. Renombrar **Sin publicar** a la versión nueva, con su fecha.
  3. Actualizar la versión y la fecha de la portada.
  4. Exportar el PDF y revisarlo con el checklist de arriba.
- Qué número sube:
  - si cambia un flujo, sube la versión menor (`1.1`);
  - si hay un módulo nuevo o se reorganizan los capítulos, sube la mayor (`2.0`).

## Cómo se redacta

- Español neutro, tratando al lector de **usted**.
- Botones, menús y pantallas en **negrita**, con el texto exacto de la UI.
- Procedimientos en pasos numerados, con una acción por paso, y un "Qué pasa si…" cuando la pantalla tiene un error conocido.
- Sin jerga técnica: ni "endpoint", ni "token", ni "localStorage", ni códigos HTTP, ni códigos de permiso. Los mensajes de error se citan tal como los muestra la pantalla.
- Nada se escribe sin verificarlo en la app corriendo. Si la UI y el spec difieren, manda la UI.
