<div align="center">

<br><br><br><br><br><br>

# METRIKA 360

## Manual de usuario

<br>

**Versión 1.0 · Sin publicar**

<br><br><br><br><br><br>

Control de calidad de pesajes en planta

</div>

<div style="page-break-after: always"></div>

## Índice

1. [Introducción](#cap-1)
   1. [Qué es METRIKA 360](#cap-1-1)
   2. [Los roles y qué hace cada uno](#cap-1-2)
   3. [El ciclo de un lote](#cap-1-3)
2. [Requisitos](#cap-2)
   1. [Navegador](#cap-2-1)
   2. [Conectar la báscula](#cap-2-2)
   3. [Estados de la báscula](#cap-2-3)
3. [Primeros pasos](#cap-3)
   1. [Ingresar](#cap-3-1)
   2. [Contraseña vencida](#cap-3-2)
   3. [La portada y el menú lateral](#cap-3-3)
   4. [Ajustes](#cap-3-4)

<div style="page-break-after: always"></div>

<a id="cap-1"></a>

## 1. Introducción

<a id="cap-1-1"></a>

### 1.1 Qué es METRIKA 360

METRIKA 360 es el sistema de control de calidad de pesajes en planta. Lee el peso directamente del indicador de la báscula, lo compara con el rango definido para cada lote y registra cada pesaje con su ticket impreso.

Con METRIKA 360 usted puede:

- Registrar pesajes con la báscula conectada al equipo, sin escribir el peso a mano.
- Saber al instante si un peso está dentro del rango del lote (mínimo, ideal y máximo).
- Exigir la autorización de un supervisor cuando un peso supera el máximo.
- Imprimir el ticket que identifica cada bulto.
- Consultar el historial de pesajes y el estado de cada cliente y cada lote.
- Administrar los documentos fiscales de los lotes finalizados.
- Seguir la planta en vivo, consultar métricas de calidad y hacer preguntas a un asistente con inteligencia artificial.

<a id="cap-1-2"></a>

### 1.2 Los roles y qué hace cada uno

Cada usuario tiene un rol. El rol decide qué módulos ve en el menú lateral y qué acciones puede hacer. Si le falta un módulo que necesita para su trabajo, pídale al administrador del sistema que revise su rol.

| Rol | Qué hace | Capítulo |
| --- | --- | --- |
| **Operador** | Registra los pesajes en la báscula, crea clientes y lotes, y revisa el historial. | [4](#cap-4) |
| **Supervisor** | Autoriza con su PIN los pesos que superan el máximo, inspecciona lotes y pesajes, y consulta el Mirador, las métricas y el asistente Agri. | [5](#cap-5) |
| **Administrador** | Tiene acceso a todos los módulos del sistema. | [6](#cap-6) |
| **Contador** | Administra los documentos fiscales. | [7](#cap-7) |
| **Aprobador** | Aprueba los lotes y sus pesajes desde la aplicación móvil. | [8](#cap-8) |

El detalle de qué pantallas ve cada rol está en el [Anexo A](#cap-anexo-a).

<a id="cap-1-3"></a>

### 1.3 El ciclo de un lote

Un lote es un conjunto de bultos de un mismo producto para un cliente. Cada lote pasa por estas etapas:

1. **En proceso.** El lote está abierto y recibe pesajes en la báscula.
2. **Cliente final.** Se terminó de pesar y alguien con permiso aprobó el lote. El lote ya no recibe pesajes y queda esperando la revisión del aprobador.
3. **Finalizado.** El aprobador revisó los pesajes desde la aplicación móvil y dio el lote por terminado. Solo un lote finalizado puede incluirse en un documento fiscal.

En las etapas **En proceso** y **Cliente final**, un lote también puede **rechazarse**. Un lote rechazado sale del ciclo y no recibe más pesajes.

<div style="page-break-after: always"></div>

<a id="cap-2"></a>

## 2. Requisitos

<a id="cap-2-1"></a>

### 2.1 Navegador

METRIKA 360 se usa desde el navegador, sin instalar nada en el equipo.

- **Para pesar**, el equipo de la báscula necesita **Google Chrome** o **Microsoft Edge** en una computadora de escritorio o portátil. Otros navegadores (Firefox, Safari) y los celulares no pueden leer la báscula.
- **Para el resto de los módulos** sirve cualquier navegador actualizado. Salvo la báscula, el sistema también se puede abrir desde el celular.

Si abre la pantalla de pesaje en un navegador que no puede leer la báscula, verá el aviso *"Este navegador no permite leer la báscula. Abra el sistema en Chrome o Edge de escritorio."*

<a id="cap-2-2"></a>

### 2.2 Conectar la báscula

El indicador de la báscula se conecta a la computadora por un cable USB o por un adaptador serial a USB.

**La primera vez en un equipo** hay que darle permiso al navegador para usar la báscula:

1. Conecte el cable del indicador a la computadora y encienda el indicador.
2. Entre a la pantalla de pesaje (vea el [capítulo 4.1](#cap-4-1)).
3. Pulse **Conectar Báscula**. Se abre el diálogo **Seleccionar báscula**.
4. Pulse **Autorizar báscula nueva**. El navegador muestra su propia lista de dispositivos.
5. Elija el puerto de la báscula en la lista del navegador y pulse **Conectar**.
6. El sistema le pide un nombre para reconocerla después, por ejemplo *Báscula Piso 1*. Escríbalo y pulse **Guardar**.

Cuando la báscula se conecta, aparece el aviso **Báscula conectada**, con la lectura en vivo, el cliente y el lote. Se cierra solo en unos segundos, o con **Empezar a pesar**.

**Las veces siguientes** no hace falta repetir el permiso:

- Al entrar a la pantalla de pesaje, el sistema se conecta solo a la última báscula que usó en ese equipo.
- Si no se conecta sola, pulse **Conectar Báscula** y elija la báscula de la lista. La última que usó aparece marcada como **Preferida**.

El permiso y el nombre de la báscula quedan guardados en ese navegador y en ese equipo. En otro equipo, o en otro navegador, hay que autorizarla de nuevo.

<a id="cap-2-3"></a>

### 2.3 Estados de la báscula

Arriba a la derecha de la pantalla de pesaje, una etiqueta muestra el estado de la conexión con la báscula:

| Estado | Qué significa | Qué hacer |
| --- | --- | --- |
| **Báscula en línea** | La báscula está conectada y enviando el peso. | Puede pesar. |
| **Conectando…** | El sistema está abriendo la conexión. | Esperar unos segundos. |
| **Sin señal** | La conexión está abierta, pero el indicador dejó de enviar el peso hace más de 4 segundos. | Verificar que el indicador esté encendido y que el cable esté firme. Si la señal vuelve, el estado se recupera solo; si no, pulsar **Reintentar**. |
| **Reconectando… (n/6)** | Se perdió la conexión y el sistema intenta recuperarla solo, hasta 6 veces. | Revisar el cable mientras tanto. |
| **Desconectada** | No hay conexión con la báscula. | Pulsar **Conectar Báscula**. |
| **Error de puerto** | No se pudo abrir la conexión con la báscula. | Revisar el cable y pulsar **Reintentar**. Si sigue, desconectar y volver a conectar el cable. |
| **Navegador no compatible** | El navegador no puede leer la báscula. | Abrir el sistema en Chrome o Edge de escritorio. |

**Mientras la báscula no está en línea, no se pueden registrar pesajes.** Debajo del encabezado aparece una franja que explica el problema, y en verde *"Comunicación con la báscula restablecida."* cuando la conexión vuelve.

**Si la conexión se corta**, el sistema avisa de tres formas para que lo note aunque no esté mirando la pantalla: emite tres pitidos, hace parpadear el título de la pestaña del navegador y abre un aviso con:

- el motivo del corte (por ejemplo, **Báscula desconectada** o **Báscula sin señal**);
- la **Hora del corte** y la **Última lectura**;
- los botones **Reintentar conexión** y **Entendido, seguir sin báscula**.

Si el corte ocurrió en medio de un pesaje, el aviso lo dice: *"El pesaje en curso quedó invalidado. Retire el producto, reconecte la báscula y repita la muestra."* Ese pesaje no se guardó y hay que volver a pesarlo.

<div style="page-break-after: always"></div>

<a id="cap-3"></a>

## 3. Primeros pasos

Este capítulo vale para todos los roles.

<a id="cap-3-1"></a>

### 3.1 Ingresar

![Pantalla de ingreso](capturas/3-1-login.png)

*La pantalla de ingreso.*

1. Abra en el navegador la dirección de METRIKA 360 que le dio su empresa.
2. En **Usuario**, escriba su usuario. Se convierte a mayúsculas solo.
3. En **Contraseña**, escriba su contraseña. Con el ícono del ojo puede verla mientras la escribe.
4. Pulse **Ingresar**.

Al ingresar, el sistema lo lleva a la portada.

**Qué pasa si…**

- **Los datos no son correctos.** El error aparece en rojo debajo de los campos. Revise el usuario y la contraseña, y vuelva a intentarlo.
- **Su contraseña venció.** Se abre el diálogo para cambiarla. Siga el [capítulo 3.2](#cap-3-2).
- **No ve ningún módulo después de ingresar.** La portada dice *"Todavía no tenés módulos habilitados"*. Su usuario no tiene permisos asignados: pídale al administrador del sistema que los revise.

La sesión queda abierta en ese navegador hasta que usted la cierre (vea el [capítulo 3.4](#cap-3-4)). Si se le asignan permisos nuevos, tiene que cerrar sesión y volver a ingresar para verlos.

<a id="cap-3-2"></a>

### 3.2 Contraseña vencida

Las contraseñas vencen. Además, **todo usuario nuevo empieza con la contraseña vencida**, así que la primera vez que ingrese tendrá que cambiarla.

![Diálogo de contraseña vencida](capturas/3-2-password-vencida.png)

*El diálogo para elegir una contraseña nueva, con sus requisitos.*

1. Ingrese con su usuario y su contraseña actual, como siempre. Se abre el diálogo **Tu contraseña venció**.
2. En **Contraseña nueva**, escriba la contraseña nueva.
3. En **Confirmación**, repítala.
4. Revise la lista de requisitos. Cada uno se marca en verde cuando se cumple:
   - Al menos 8 caracteres.
   - Al menos una mayúscula.
   - Al menos un número.
   - Distinta de la contraseña actual.
   - Las contraseñas coinciden.
5. Cuando se cumplen todos, pulse **Cambiar contraseña**.
6. Aparece el aviso *"Ingresá con tu contraseña nueva."* El diálogo se cierra y el campo de contraseña queda vacío.
7. Escriba la contraseña nueva y pulse **Ingresar**.

Cambiar la contraseña **no** lo hace ingresar solo: hay que ingresar con la nueva, como en el paso 7.

**Qué pasa si…**

- **Cierra el diálogo sin cambiar la contraseña.** Puede cerrarlo con **Cancelar**, con la X o con la tecla Esc. Su contraseña sigue vencida, y el diálogo vuelve a abrirse la próxima vez que ingrese.
- **El cambio falla.** El error aparece dentro del diálogo, que sigue abierto. Corrija lo que indique y vuelva a pulsar **Cambiar contraseña**.

<a id="cap-3-3"></a>

### 3.3 La portada y el menú lateral

![Portada con el menú lateral](capturas/3-3-portada.png)

*La portada de un administrador, con todos los módulos en el menú lateral.*

La **portada** es lo primero que ve al ingresar. Tiene:

- Un saludo con su nombre, la fecha y su rol.
- **Accesos rápidos** a los módulos que su rol tiene habilitados: **Registrar pesaje**, **Historial de pesajes**, **Clientes** y **Documentos fiscales**.
- La tarjeta del **Mirador** y la de **Agri**, si su rol las tiene.
- **Cómo funciona**, el recorrido de cada bulto en tres pasos: seleccionar, pesar y etiquetar.

El **menú lateral**, a la izquierda, está siempre a la vista. Muestra solo lo que su rol puede usar:

| Item del menú | Para qué sirve | Capítulo |
| --- | --- | --- |
| **Agri** · Asistente IA | Hacer preguntas sobre lotes, pesajes y calidad. | [5.3](#cap-5-3) |
| **Mirador** · Planta en vivo · 3D | Ver la planta en vivo. | [5.4](#cap-5-4) |
| **Control de Calidad** → **Registrar Pesaje** | Pesar con la báscula. | [4.1](#cap-4-1) |
| **Control de Calidad** → **Historial Pesajes** | Consultar lo pesado y descargar tickets. | [4.8](#cap-4-8) |
| **Administración** → **Documentos Fiscales** | Administrar los documentos fiscales. | [7](#cap-7) |
| **Clientes** | Inspeccionar clientes, lotes y pesajes. | [4.6](#cap-4-6) |
| **Métricas** | Ver los indicadores de calidad. | [5.5](#cap-5-5) |

**Control de Calidad** y **Administración** son grupos: púlselos para abrir o cerrar sus opciones.

Al pie del menú están su nombre y su rol, **Ajustes** y **Cerrar Sesión**.

<a id="cap-3-4"></a>

### 3.4 Ajustes

![Ajustes](capturas/3-4-ajustes.png)

*Ajustes: perfil, apariencia y sesión.*

En **Ajustes**, al pie del menú lateral, encontrará:

- **Su perfil**: su nombre, su rol y cuántos permisos tiene.
- **Apariencia**: cómo se ve el sistema en este equipo.
  - **Automático** sigue la configuración de la computadora.
  - **Claro** está pensado para los turnos de día.
  - **Oscuro** está pensado para los turnos de noche.

  La elección se guarda en este navegador, así que otro equipo de la planta puede tener un modo distinto.
- **Sesión**: el botón **Cerrar sesión**.

**Cerrar sesión.** Pulse **Cerrar sesión** en Ajustes, o **Cerrar Sesión** al pie del menú lateral. El sistema vuelve a la pantalla de ingreso. Los pesajes ya registrados no se pierden.

Cierre la sesión siempre que deje un equipo compartido. Mientras siga abierta, cualquiera que use ese equipo trabaja con su usuario.

<div style="page-break-after: always"></div>
