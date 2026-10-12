# SPEC 17 — Manual de usuario de METRIKA 360

> **Estado:** Approved
> **Depende de:** SPEC 07 (permisos), SPEC 11 (ticket obligatorio), SPEC 13 (Mirador), SPEC 14 (contraseña vencida), SPEC 15 (métricas) y SPEC 16 (PIN de supervisor) de este repo, porque el manual describe lo que esos specs dejaron en pantalla
> **Fecha:** 2026-10-12
> **Objetivo:** Escribir en `docs/manual/MANUAL.md` el manual de usuario de METRIKA 360 para escritorio, con capítulos por rol, capturas con datos de demo, requisitos de la báscula, solución de problemas y glosario, listo para exportar a PDF a mano y entregar al cliente.

---

## Por qué existe este spec

El sistema se va a entregar a un cliente y hoy no tiene ninguna documentación para quien lo usa. Todo lo que existe (`CLAUDE.md` y los specs) está escrito para desarrolladores: habla de hooks, endpoints y permisos por su código.

Hay tres cosas que conviene saber antes de leer el resto.

**La primera: el manual es una foto del sistema y envejece con él.** Si no se actualiza en el mismo cambio que toca una pantalla, a la segunda entrega ya describe botones que no existen. Por eso vive en el repo, en Markdown, al lado del código, y `CLAUDE.md` lo vuelve obligatorio.

**La segunda: los capítulos son por rol, pero lo que ve cada rol lo decide la base de datos.** Los permisos se asignan por rol en la tabla `permisos` del backend, y el front solo los consulta (SPEC 07). El manual describe la asignación vigente en `db/seed.sql` del backend a la fecha de este spec. Si el cliente cambia los permisos de un rol, el capítulo de ese rol queda desactualizado. Ver Riesgos.

**La tercera: dos roles no tienen hoy el acceso que el manual les describe.**

- El `CONTADOR` no tiene ninguna fila en `permisos`. "Documentos Fiscales" pide `MODULO-ADMINISTRACION`, así que hoy no ve el módulo. El manual describe el flujo previsto, y asignarle el permiso en la base es un prerrequisito de la entrega, fuera de este spec.
- El `APROBADOR` trabaja en la app móvil, que es otro producto. Este manual explica dónde entra en el ciclo del lote y remite al manual de esa app.

---

## Alcance

**Entra:**

- `docs/manual/MANUAL.md`: un único archivo con el manual completo.
- `docs/manual/capturas/`: las capturas de pantalla, en PNG, referenciadas desde el manual con rutas relativas.
- `docs/manual/README.md`: cómo exportar el manual a PDF, cómo tomar las capturas, la lista de capturas y cómo subir la versión.
- `docs/manual/.gitignore` con `*.pdf`: el PDF no se versiona.
- Una portada con el nombre del producto (METRIKA 360), el logo de la app, la versión y la fecha. **Sin el nombre del cliente.**
- Capítulos por rol: `OPERADOR`, `SUPERVISOR`, `ADMIN` y `CONTADOR`, más una sección breve sobre el `APROBADOR`.
- Un tronco común para todos los roles: ingresar, contraseña vencida, la portada, el menú lateral y Ajustes.
- Requisitos y báscula: el navegador, cómo conectar el indicador, el permiso del puerto serial y qué significa cada estado de la báscula.
- Solución de problemas (FAQ).
- Glosario.
- Un anexo con la matriz rol → pantallas.
- Un historial de versiones al final.
- `CLAUDE.md`: una regla que obliga a actualizar el manual en el mismo cambio que modifica algo visible para el usuario.

**Fuera (para specs futuros):**

- Las pantallas de la app móvil del `APROBADOR`. Tienen su propio manual.
- Corregir la asignación de permisos en la base (`CONTADOR` sin `MODULO-ADMINISTRACION`). Es un prerrequisito de la entrega, pero va aparte.
- Los permisos del aprobador con guion bajo (`VER_CLIENTES_APROBADOR`, `FINALIZAR_LOTE_APROBADOR`…), que no están en `PERMISSIONS`. Los usa la app móvil.
- Las tareas que hoy se hacen por Swagger o SQL: asignar PINs de supervisor, registrar usuarios, resetear contraseñas y sembrar permisos. El manual dice que las hace el administrador del sistema, pero no explica cómo.
- Las pantallas móviles de la web. Una nota aclara que, salvo la báscula, el sistema se puede abrir desde el celular.
- Una ayuda dentro de la app (`/ayuda`) o un enlace al manual desde el `Sidebar`.
- Una exportación automática a PDF (`md-to-pdf`, Pandoc o un script de npm).
- Capturas automáticas (Playwright).
- Traducción a otro idioma.
- Los datos de contacto de soporte. Se agregan a mano en cada entrega, fuera del repo.

---

## Modelo de datos

Este spec no introduce estructuras de datos ni código. Lo que sigue es la estructura del documento y sus convenciones.

### Archivos

| Archivo | Contenido |
| --- | --- |
| `docs/manual/MANUAL.md` | El manual completo. |
| `docs/manual/capturas/*.png` | Capturas, nombradas como se indica más abajo. |
| `docs/manual/README.md` | Para el equipo, no para el cliente: exportar, capturar y versionar. |
| `docs/manual/.gitignore` | `*.pdf` |
| `CLAUDE.md` | Sección nueva "Manual de usuario". |

### Estructura de `MANUAL.md`

```
Portada — METRIKA 360 · Manual de usuario · Versión 1.0 · <fecha>
Índice (enlaces a cada sección)

1. Introducción
   1.1 Qué es METRIKA 360
   1.2 Los roles y qué hace cada uno
   1.3 El ciclo de un lote: EN PROCESO → CLIENTE FINAL → FINALIZADO (o RECHAZADO)
2. Requisitos
   2.1 Navegador: Chrome o Edge de escritorio (la báscula no funciona en otros)
   2.2 Conectar la báscula y dar permiso al puerto serial
   2.3 Estados de la báscula
3. Primeros pasos (todos los roles)
   3.1 Ingresar
   3.2 Contraseña vencida (primer ingreso y vencimiento)
   3.3 La portada y el menú lateral (qué ve cada rol)
   3.4 Ajustes: perfil, tema claro/oscuro, cerrar sesión
4. Operador
   4.1 Registrar un pesaje (cliente → lote → báscula → tara → ticket)
   4.2 El rango de peso y los estados de calidad
   4.3 Peso sobre el máximo: el Bloqueo Crítico y el PIN del supervisor
   4.4 Imprimir el ticket (obligatorio) y qué hacer si falla
   4.5 Crear un cliente y crear un lote
   4.6 Inspección de clientes, lotes y pesajes
   4.7 Aprobar o rechazar un lote
   4.8 Historial de pesajes: filtros, páginas y descarga del ticket
5. Supervisor
   5.1 Autorizar un peso con el PIN
   5.2 Inspección y rechazo de pesajes
   5.3 Agri, el asistente con IA
   5.4 Mirador: la planta en vivo
   5.5 Métricas de calidad
6. Administrador
   6.1 Qué ve el administrador (todos los módulos; remite a los capítulos 4, 5 y 7)
   6.2 Lo que solo hace el administrador: rechazar un cliente
   6.3 Tareas fuera de la pantalla (PINs, usuarios, permisos): solo se mencionan
7. Contador
   7.1 Documentos fiscales: listar y filtrar
   7.2 Crear un documento fiscal
   7.3 Ver el detalle de un documento fiscal
8. Aprobador
   8.1 Dónde entra en el ciclo del lote (aprueba en CLIENTE FINAL desde la app móvil)
   8.2 Remisión al manual de la app móvil
9. Solución de problemas
10. Glosario
Anexo A. Matriz rol → pantallas
Historial de versiones
```

### Matriz rol → pantallas (anexo A)

Sale de `db/seed.sql` del backend a la fecha de este spec, traducida a pantallas. El manual habla de pantallas y acciones, y no muestra los códigos de permiso.

| Pantalla / acción | OPERADOR | SUPERVISOR | ADMIN | CONTADOR | APROBADOR |
| --- | --- | --- | --- | --- | --- |
| Registrar pesaje e historial (`MODULO-CONTROL-CALIDAD`) | Sí | — | Sí | — | — |
| Clientes / inspección (`MODULO-CLIENTES`, `VER-CLIENTE-LOTES`) | Sí | Sí | Sí | — | — |
| Crear cliente y crear lote | Sí | — | Sí | — | — |
| Aprobar y rechazar lote | Sí | Sí | Sí | — | — |
| Rechazar pesaje | — | Sí | Sí | — | — |
| Rechazar cliente | — | — | Sí | — | — |
| Agri | — | Sí | Sí | — | — |
| Mirador | — | Sí | Sí | — | — |
| Métricas | — | Sí | Sí | — | — |
| Documentos fiscales (`MODULO-ADMINISTRACION`) | — | — | Sí | Sí (*) | — |
| Autorizar con PIN (Bloqueo Crítico) | — | Sí (**) | — | — | — |
| Aprobación en CLIENTE FINAL | — | — | — | — | App móvil |

(*) Previsto: requiere asignar `MODULO-ADMINISTRACION` al `CONTADOR` en la base antes de entregar.
(**) El PIN se tipea en la pantalla del operario. No hace falta que el supervisor tenga sesión abierta.

El día de la entrega, esta tabla se compara con la tabla `permisos` de la base **de producción** y se corrige si difiere (ver Plan, paso 9).

### Convenciones de redacción

- Español neutro, tratando al lector de **usted**. El cliente opera en Honduras.
- Los nombres de botones, menús y pantallas van en **negrita** y escritos exactamente como aparecen en la UI (**Registrar Pesaje**, **Imprimir ticket**).
- Los procedimientos son pasos numerados, de una acción por paso.
- Cada procedimiento termina con "Qué pasa si…" cuando la pantalla tiene un error conocido: PIN incorrecto, el ticket que falla, el backend caído.
- Sin jerga técnica: ni "endpoint", ni "token", ni "localStorage", ni "403", ni códigos de permiso. Los mensajes de error se citan tal como los muestra la pantalla.
- Ninguna afirmación se escribe sin verificarla en la app corriendo. Si la UI y este spec difieren, manda la UI.
- Las imágenes van con ruta relativa (`![Báscula con peso estable](capturas/4-1-bascula-estable.png)`) y con un pie de una línea en cursiva debajo.

### Capturas

- Se toman **a mano**, en escritorio, a 1440 × 900, con el tema claro, en Chrome.
- Siempre con **datos de demo**: clientes, lotes y usuarios ficticios. Nunca un nombre de cliente real, un RTN real ni el nombre de un usuario real en la barra lateral.
- Nombre del archivo: `<sección>-<pantalla>-<estado>.png`, en kebab-case, con la sección del manual a la que pertenece (`4-1-bascula-estable.png`, `3-2-password-vencida.png`).
- `docs/manual/README.md` lleva la lista completa de capturas, con el nombre de archivo y qué tiene que verse en cada una. Esa lista es el checklist de quien las toma.

Lista mínima:

| Archivo | Qué se ve |
| --- | --- |
| `3-1-login.png` | La pantalla de ingreso. |
| `3-2-password-vencida.png` | El diálogo de renovación con su checklist de reglas. |
| `3-3-portada.png` | La portada con el menú lateral de un `ADMIN`. |
| `3-4-ajustes.png` | Ajustes: perfil, apariencia y sesión. |
| `4-1-seleccion-cliente.png` | La grilla de clientes de **Registrar Pesaje**. |
| `4-1-seleccion-lote.png` | Los lotes del cliente elegido. |
| `4-1-bascula-conectar.png` | La báscula antes de conectar, con el selector de puerto. |
| `4-1-bascula-estable.png` | Un peso estable dentro del rango. |
| `4-1-tara.png` | El diálogo de tara. |
| `4-3-bloqueo-critico.png` | El Bloqueo Crítico pidiendo el PIN. |
| `4-3-tara-autorizada.png` | La tara con "Autorizado por …". |
| `4-4-ticket.png` | El modal **Imprimir ticket**. |
| `4-5-crear-cliente.png` | El formulario de cliente nuevo. |
| `4-5-crear-lote.png` | El formulario de lote nuevo. |
| `4-6-inspeccion-clientes.png` | La tabla paginada de inspección de clientes. |
| `4-6-inspeccion-pesajes.png` | Los pesajes de un lote. |
| `4-8-historial.png` | El historial con filtros. |
| `5-3-agri.png` | Agri con una pregunta y su respuesta. |
| `5-4-mirador.png` | El Mirador con un lote seleccionado. |
| `5-5-metricas.png` | El tablero de métricas. |
| `7-1-documentos-fiscales.png` | La lista de documentos fiscales. |
| `7-2-crear-documento-fiscal.png` | El formulario de documento fiscal. |
| `7-3-detalle-documento-fiscal.png` | El detalle de un documento. |

### Versión del manual

- La portada dice `Versión X.Y · <fecha>`, y la primera entrega es la `1.0`.
- Al final, "Historial de versiones" tiene un bloque **Sin publicar** arriba de todo. Cada cambio que actualiza el manual agrega una línea ahí.
- Al entregar, **Sin publicar** se renombra a la versión nueva con su fecha, y se actualiza la portada:
  - si cambia un flujo, sube la versión menor (`1.1`);
  - si hay un módulo nuevo o se reorganizan los capítulos, sube la mayor (`2.0`).

### Exportar a PDF (en `README.md`)

A mano, con la extensión **Markdown PDF** (`yzane.markdown-pdf`) de VS Code: abrir `MANUAL.md` y ejecutar **Markdown PDF: Export (pdf)**. Las capturas se resuelven por ruta relativa. El PDF queda en `docs/manual/` y el `.gitignore` lo ignora.

El README también dice qué revisar en el PDF antes de mandarlo:

- que se vean todas las imágenes;
- que la portada tenga la versión y la fecha;
- que ningún dato real aparezca en las capturas;
- agregar el contacto de soporte de esa entrega.

---

## Plan de implementación

Los pasos 1 a 6 y el 8 los puede escribir `/spec-impl` leyendo el código y la app. El paso 7 lo hace una persona. Cada paso deja un manual coherente: lo que todavía no se escribió no aparece en el índice.

1. **Esqueleto.** Crear `docs/manual/` con:
   - `MANUAL.md`, con la portada (versión `1.0`, la fecha de la entrega a completar en el paso 9, logo `public/logo192.png` por ruta relativa) y el índice con las secciones del capítulo 1;
   - `README.md`, con la exportación, las reglas de captura, la lista de capturas y la regla de versiones;
   - `.gitignore`, con `*.pdf`.

   Prueba: exportar a PDF y que la portada salga con el logo.
2. **Capítulos 1 a 3.** Introducción, requisitos, báscula y primeros pasos. Antes de redactar los estados de la báscula, leerlos en `useSerialScale.tsx` y verificarlos en la app. Las referencias a capturas que todavía no existen se escriben con el nombre final de la lista.
3. **Capítulo 4 (Operador).** Recorrer el flujo completo en la app con un usuario `OPERADOR` y datos de demo, incluidos el Bloqueo Crítico, el ticket que falla dos veces y la salida de emergencia.
4. **Capítulo 5 (Supervisor).** Recorrerlo con un usuario `SUPERVISOR` que tenga un PIN asignado.
5. **Capítulos 6 a 8 (Administrador, Contador, Aprobador).** El de Contador se recorre con un usuario `ADMIN`, porque hoy es el único que ve Documentos Fiscales. El de Aprobador no tiene pantallas.
6. **Capítulo 9, glosario, anexo A e historial de versiones.** La FAQ cubre como mínimo:
   - la báscula no aparece o el navegador no es compatible;
   - la báscula dice "sin señal" o está reconectando;
   - la contraseña vencida;
   - el PIN incorrecto;
   - el ticket que no se imprime;
   - "no veo un menú";
   - "la pantalla dice que no hay conexión".

   El glosario cubre como mínimo: lote, pesaje, peso bruto, tara, peso neto, rango (mínimo, ideal, máximo), estado de calidad, etapa, Bloqueo Crítico, ticket y documento fiscal.
7. **Capturas (manual, lo hace una persona).** Levantar un entorno con datos de demo, tomar cada captura de la lista y guardarla en `docs/manual/capturas/` con su nombre. Prueba: ninguna imagen rota en la vista previa de VS Code.
8. **`CLAUDE.md`.** Agregar la sección "Manual de usuario":
   - el manual vive en `docs/manual/MANUAL.md`;
   - todo cambio visible para el usuario (una pantalla, un botón, un texto, un permiso o un flujo nuevo) lo actualiza en el mismo cambio, junto con una línea en **Sin publicar**;
   - si cambia una pantalla capturada, se marca la captura para rehacer en la lista del README.
9. **Antes de la primera entrega.**
   - Comparar el anexo A con la tabla `permisos` de producción.
   - Confirmar que el `CONTADOR` ya tiene `MODULO-ADMINISTRACION`.
   - Pasar **Sin publicar** a `1.0` con la fecha y exportar el PDF.

---

## Criterios de aceptación

- [ ] Existen `docs/manual/MANUAL.md`, `docs/manual/README.md`, `docs/manual/.gitignore` (con `*.pdf`) y `docs/manual/capturas/`.
- [ ] La portada dice "METRIKA 360", "Manual de usuario", una versión y una fecha, y no nombra a ningún cliente.
- [ ] El manual tiene las secciones 1 a 10, el anexo A y el historial de versiones, en el orden de este spec, y el índice enlaza a cada una.
- [ ] Hay un capítulo para cada rol: `OPERADOR`, `SUPERVISOR`, `ADMIN` y `CONTADOR`. El del `APROBADOR` explica su lugar en el ciclo del lote y remite a la app móvil, sin pantallas.
- [ ] El capítulo 2 dice que la báscula solo funciona en Chrome o Edge de escritorio, y explica cada estado de la báscula que muestra la pantalla.
- [ ] El capítulo 4 explica que el ticket es obligatorio y cuándo aparece la salida de emergencia (dos fallos).
- [ ] El capítulo 4.3 explica que el PIN lo tipea un supervisor y que el nombre del supervisor queda en la tara.
- [ ] Cada procedimiento es una lista numerada, y cada botón citado existe con ese texto exacto en la UI.
- [ ] Ninguna sección contiene "endpoint", "token", "localStorage", códigos de status HTTP ni códigos de permiso (`MODULO-…`, `VER-…`).
- [ ] El capítulo 9 responde las siete preguntas del paso 6, y el glosario define los términos listados ahí.
- [ ] Todas las capturas de la lista del README existen en `docs/manual/capturas/`, con ese nombre exacto, y ninguna referencia de imagen en `MANUAL.md` está rota.
- [ ] Ninguna captura muestra un cliente, un RTN o un usuario reales.
- [ ] El anexo A coincide con la tabla `permisos` de la base de producción el día de la entrega.
- [ ] Exportar `MANUAL.md` con Markdown PDF produce un PDF con todas las imágenes visibles, siguiendo solo los pasos del README.
- [ ] `git status` no muestra el PDF después de exportarlo.
- [ ] `CLAUDE.md` tiene la sección "Manual de usuario" con la regla de actualizarlo en el mismo cambio.
- [ ] No se modificó ningún archivo de `src/` ni `package.json`.

---

## Decisiones

- **Sí:** Markdown en `docs/manual/`, versionado con el código. Decisión del usuario. Un cambio de pantalla y su manual viajan en el mismo commit.
- **No:** Word, un Claude Doc o una ayuda dentro de la app. Los dos primeros se desincronizan del código; la ayuda en la app suma rutas y componentes, y es otro spec.
- **Sí:** un único `MANUAL.md`. Decisión del usuario. Se exporta en un solo paso.
- **No:** un archivo por capítulo. Habría que unirlos a mano antes de cada exportación.
- **Sí:** capítulos por rol fijo. Decisión del usuario. El cliente piensa en "el operario" y "el contador", no en permisos.
- **No:** capítulos por tarea con una matriz de permisos. Es más resistente a cambios en los roles, pero es menos directo para quien lo lee.
- **Sí:** un anexo con la matriz rol → pantallas, verificado contra producción el día de la entrega. Es lo que vuelve visible que el manual quedó viejo si alguien cambió los permisos de un rol.
- **Sí:** el manual describe el acceso previsto del `CONTADOR`, y la corrección de permisos en la base es un prerrequisito de la entrega. Decisión del usuario. Mezclar cambios de datos con documentación en un mismo spec complica revisar los dos.
- **Sí:** el `APROBADOR` solo aparece en el ciclo del lote, con remisión a la app móvil. Decisión del usuario. Sus pantallas son de otro producto.
- **Sí:** capturas a mano con datos de demo. Decisión del usuario. Son pocas, y la báscula real no se puede simular sin trabajo extra.
- **No:** capturas automáticas con Playwright. Habría que simular el login y la Web Serial API, y sumaría una dependencia.
- **Sí:** exportar a PDF a mano. Decisión del usuario.
- **Sí:** la extensión Markdown PDF de VS Code como procedimiento documentado. Resuelve las imágenes relativas y no toca `package.json`. Elegir una sola herramienta hace que el PDF salga igual sin importar quién lo exporte.
- **No:** `md-to-pdf` ni Pandoc. Uno suma una dependencia y el otro pide LaTeX instalado fuera de npm.
- **No:** versionar el PDF. Decisión del usuario. Es un derivado de la fuente.
- **Sí:** solo escritorio. Decisión del usuario. La báscula no funciona en el celular.
- **Sí:** se incluyen requisitos y báscula, FAQ y glosario. Decisión del usuario.
- **No:** documentar las tareas de Swagger (PINs, usuarios, permisos). Decisión del usuario. Son tareas internas, sin pantalla.
- **Sí:** la marca del producto sin el nombre del cliente. Decisión del usuario. El mismo manual sirve para cualquier entrega.
- **Sí:** versión e historial de cambios, sin contacto de soporte. Decisión del usuario. El contacto cambia por entrega.
- **Sí:** una regla en `CLAUDE.md` para actualizar el manual en el mismo cambio. Decisión del usuario. Sin la regla, el manual envejece en silencio.
- **Sí:** tratar al lector de usted. Es el registro esperable en un entregable formal para un cliente en Honduras.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El cliente cambia los permisos de un rol y el capítulo describe pantallas que ese rol ya no ve | El anexo A lo hace visible. Se verifica contra producción en cada entrega (paso 9). |
| Se entrega el manual con el `CONTADOR` todavía sin `MODULO-ADMINISTRACION` | El paso 9 lo exige antes de exportar. El capítulo 7 marca el acceso como previsto. |
| La `1.0` describe la UI de hoy, y un PR posterior cambia una pantalla sin tocar el manual | La regla de `CLAUDE.md`, y la revisión de **Sin publicar** antes de cada entrega. |
| Una captura filtra datos reales de un cliente | La regla de datos de demo y un criterio de aceptación propio. Se revisa en el PDF antes de mandarlo. |
| Las capturas quedan viejas tras un cambio de diseño | La regla de `CLAUDE.md` marca la captura para rehacer en la lista del README. |
| Markdown PDF no respeta los saltos de página entre capítulos | El README indica cómo forzar un salto con `<div style="page-break-after: always"></div>`, que la extensión respeta. |
| `OPERADOR` tiene aprobar y rechazar lote en el seed, y eso puede no ser lo que el cliente espera | El manual describe el seed tal cual, y el anexo A lo muestra para que el cliente lo valide. Cambiarlo es un cambio de datos, no del manual. |

---

## Lo que **no** entra en este spec

- Las pantallas de la app móvil del aprobador.
- La corrección de permisos en la base.
- Las tareas por Swagger o SQL.
- La versión móvil de la web.
- La ayuda dentro de la app.
- La exportación o las capturas automáticas.
- Otros idiomas.
- El contacto de soporte.

Cada uno de estos, si se necesita, va en su propio spec.
