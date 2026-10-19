# Incidencias, limitaciones y pendientes

Registro del Sprint II (Fase 2): los problemas que aparecieron y cómo se resolvieron, lo que se acepta como limitación en esta entrega y lo que queda para el siguiente sprint.

1. [Incidencias resueltas](#1-incidencias-resueltas) (42)
2. [Limitaciones conocidas](#2-limitaciones-conocidas)
3. [Tareas pendientes para el siguiente sprint](#3-tareas-pendientes-para-el-siguiente-sprint)

## 1. Incidencias resueltas

Problemas encontrados durante el desarrollo, en orden, con su resolución. Varias las detectaron las pruebas automáticas (por ejemplo la 5, la 8, la 20 y la 26).

| # | Fecha | Paso | Incidencia | Resolución |
|---|---|---|---|---|
| 1 | 18/10/2026 | 1 · Entorno | MySQL no estaba en ejecución ni instalado como servicio en la máquina de desarrollo. | Se usó la MariaDB 10.4 que incluye XAMPP (compatible con MySQL), con usuario `root` sin contraseña. El README indica cómo arrancarla. |
| 2 | 18/10/2026 | 1 · Entorno | npm 11 avisa que bloqueó los scripts de instalación de `bcrypt` (`allow-scripts`). | `bcrypt` 6 incluye binarios precompilados y funciona sin compilar. Si en otra máquina falla, ejecutar `npm approve-scripts bcrypt` y `npm rebuild bcrypt`. |
| 3 | 18/10/2026 | 2 · Base de datos | Las bases creadas en el Paso 1 tenían cotejamiento `utf8mb4_general_ci`, porque se crearon antes de agregar `--collate` al script `db:create`. | Se borraron y recrearon (`db:drop` + `db:create`) con `utf8mb4_unicode_ci`. |
| 4 | 18/10/2026 | 2 · Base de datos | El `sql_mode` por defecto de XAMPP no es estricto: un INSERT con un ENUM inválido o sin un campo NOT NULL se aceptaba con solo un aviso (guardaba `''`). | Hook `afterConnect` en `config/config.js` que fija `STRICT_ALL_TABLES` en cada conexión. Lo verifica la prueba «ENUM rechaza un estado inexistente». |
| 5 | 18/10/2026 | 2 · Base de datos | `queryInterface.createTable` ignora en silencio `unique: 'nombre_indice'` (texto): correo, folio, número de serie y nombre de catálogo quedaron **sin índice único**. Lo detectaron las pruebas de duplicados. | Los índices únicos se crean con `addIndex(..., { unique: true, name })`. Se corrigieron las migraciones antes de fusionar a `main`. |
| 6 | 18/10/2026 | 2 · Base de datos | `db:reset` no volvía a sembrar: `migrate:undo:all` borra las tablas pero no `sequelize_data`, donde se registran los seeders ya ejecutados. | `db:reset` ejecutaba primero `db:seed:undo:all`. *Reemplazado después por la solución de la incidencia 33.* |
| 7 | 18/10/2026 | 2 · Base de datos | El `mysqldump` de MariaDB incluye la columna generada `cotizaciones.pendiente_ticket_id` en los INSERT; MySQL 8 rechaza valores explícitos en columnas generadas (error 3105). | `npm run db:sql` (`database/generar-sql.js`) envuelve `mysqldump`, quita esa columna de los INSERT y normaliza los fines de línea a LF. Se verificó importando el script en una base temporal. |
| 8 | 18/10/2026 | 3 · Middlewares | `asyncHandler` solo atrapaba promesas rechazadas: si el controlador lanzaba un error **antes** de su primer `await` (o no era `async`), el error escapaba sin pasar por `next()`. Express 5 lo recogía igual, pero el contrato de `asyncHandler` no se cumplía. Lo detectó la prueba unitaria. | `asyncHandler` envuelve la llamada en `try/catch` y además devuelve la promesa. Se confirmó que la versión anterior fallaba la prueba. |
| 9 | 18/10/2026 | 3 · Middlewares | En las pruebas manuales todas las rutas respondían 500 **sin ningún registro**: faltaba la tabla `sesiones` en `tecnitrack_test`, y el manejador de errores no registraba nada en el entorno de pruebas. | Se migró la base de pruebas (`npm test` ya lo hace en `globalSetup`). `errorHandler` ahora registra los 500 en **todos** los entornos, para que un fallo inesperado no pase en silencio. |
| 10 | 18/10/2026 | 3 · Middlewares | `npx sequelize-cli db:migrate --env test` migraba la base de **desarrollo**: `--env` elige el bloque de `config/config.js`, pero `config/env.js` decide qué `.env` cargar según `NODE_ENV`. | Para operar sobre la base de pruebas se usa `npx cross-env NODE_ENV=test sequelize-cli ...` (es lo que hacen `npm test` y `npm run db:create:test`). |
| 11 | 18/10/2026 | 3 · Middlewares | Los formularios con fotos (multipart) no pasarían la verificación CSRF: Multer lee el cuerpo dentro de la ruta, **después** del middleware CSRF, así que el campo `_csrf` aún no existe cuando se verifica. | csrf-csrf también acepta el token en la query string (`action="/tickets?_csrf=..."`) y en la cabecera `X-CSRF-Token`. El logger no registra la query string. |
| 12 | 18/10/2026 | 3 · Middlewares | Por defecto, express-mysql-session crea su propia tabla `sessions` al arrancar, fuera de las migraciones. | La tabla `sesiones` se crea con la migración `20261018000011-crear-sesiones.js` y el almacén usa `createDatabaseTable: false`. |
| 13 | 18/10/2026 | 3 · Middlewares | `npm run db:sql` exportaría las sesiones activas de quien genera el script (datos locales y privados). | `generar-sql.js` omite los INSERT de `sesiones`; se verificó que el script sale idéntico con y sin sesiones activas. |
| 14 | 18/10/2026 | 3 · Middlewares | Multer usa el mismo código `LIMIT_UNEXPECTED_FILE` para "más fotos que el máximo" y para "campo de archivo desconocido". | `upload.js` distingue los dos casos por el nombre del campo y da un mensaje distinto para cada uno. |
| 15 | 18/10/2026 | 4 · Autenticación | El rate limit cuenta solo intentos **fallidos** (`skipSuccessfulRequests`, que mira el código de respuesta). Si el login fallido redirigiera con flash (303), ningún intento contaría como fallo y el límite nunca se activaría. | Un login (o una consulta del portal) fallido vuelve a mostrar el formulario con **401** y el mensaje genérico. La prueba «tras 5 logins fallidos, el sexto responde 429» lo verifica. |
| 16 | 18/10/2026 | 4 · Autenticación | El helper de pruebas leía el token CSRF de `GET /`, pero con sesión abierta `/` y `/login` ahora redirigen al panel (`redirectIfAuth`) y la respuesta no trae la etiqueta `<meta name="csrf-token">`. | `obtenerTokenCsrf()` usa por defecto `/portal`, que siempre se renderiza, con o sin sesión. |
| 17 | 18/10/2026 | 4 · Autenticación | Los routers montados en el Paso 3 eran públicos y sus pruebas esperaban 200; al protegerlos, las pruebas antiguas de migas, menú y method-override fallarían o probarían otra cosa (el 401 en lugar del middleware). | Las pruebas sin sesión verifican ahora la redirección a `/login`; las de menú y migas pasaron a `auth.test.js` con sesión de admin, y la de method-override usa una ruta pública inexistente. |
| 18 | 18/10/2026 | 4 · Autenticación | Al cerrar sesión con flash no se puede dejar el mensaje "Cerraste sesión": `session.destroy()` elimina la sesión donde se guardaría. | El logout redirige a `/login?sesion=cerrada` y el login muestra el mensaje a partir de ese parámetro. |
| 19 | 18/10/2026 | 4 · Autenticación | Si el correo no existe, no hay hash con el cual comparar y la respuesta sería más rápida que con un correo real (permitiría adivinar qué correos están registrados midiendo el tiempo). | `AuthService.login` compara contra un hash señuelo cuando el correo no existe, así que `bcrypt.compare` siempre se ejecuta. |
| 20 | 19/10/2026 | 5 · CRUD | Buscar `%` en clientes devolvía **todos** los registros: el escape de comodines de `LIKE` (`utils/texto.js`) había perdido las barras invertidas al escribirse el archivo, así que `%` y `_` seguían funcionando como comodines. Lo detectó la prueba «los comodines de LIKE se buscan como texto». | Se corrigió `escaparLike` (`replace(/[\\%_]/g, '\\$&')`) y la prueba unitaria verifica la salida exacta. |
| 21 | 19/10/2026 | 5 · CRUD | `soloLecturaPara('tecnico')` deja pasar cualquier `GET`, así que el técnico podía abrir los **formularios** de nuevo y editar (aunque guardar ya respondía 403). | Las rutas `GET .../nuevo` y `GET .../:id/editar` llevan además `checkRole('admin')`. Lo verifican las pruebas «GET /clientes/nuevo responde 403», etc. |
| 22 | 19/10/2026 | 5 · CRUD | Los errores del equipo en "Nuevo cliente" llegaban con el nombre de campo del modelo (`numero_serie`), pero en ese formulario el campo se llama `equipo_numero_serie`: el mensaje no aparecía junto al campo. | `ClienteService.crear` traduce el error del equipo y antepone `equipo_` a cada campo. |
| 23 | 19/10/2026 | 5 · CRUD | Las columnas DECIMAL (precio) llegan como número (`45.5`) y no como texto (`'45.50'`), por `decimalNumbers: true` en `config/config.js`. Las primeras pruebas del catálogo esperaban texto. | Se mantiene la configuración (los cálculos de cotizaciones usarán números) y las vistas muestran el precio con `formatoPrecio` (`$45.50`). |
| 24 | 19/10/2026 | 5 · CRUD | Para comprobar que el listado usa LIMIT/OFFSET se intentó capturar el SQL cambiando `sequelize.options.logging` en la prueba, pero Sequelize ya había copiado esa opción y no registró nada. | La prueba espía `Cliente.findAndCountAll` y verifica que recibe `{ limit: 10, offset: 20 }` y devuelve solo 10 filas. |
| 25 | 19/10/2026 | 5 · CRUD | La prueba de "el técnico no ve botones" buscaba la palabra `Editar` en toda la página y fallaba porque otra prueba había creado un cliente llamado "Para Editar". | La prueba busca botones (`class="btn..."`), no texto suelto. |
| 26 | 19/10/2026 | 6 · Tickets | La prueba de **5 creaciones simultáneas** falló con un *deadlock*: la primera versión de `FolioService` hacía `INSERT IGNORE` del contador y luego `SELECT ... FOR UPDATE`. El `INSERT IGNORE` sobre una fila existente toma un bloqueo compartido; las cinco transacciones lo obtenían y luego todas esperaban el exclusivo. | El contador se incrementa con `INSERT ... ON DUPLICATE KEY UPDATE ultimo = ultimo + 1`, que toma directamente el bloqueo exclusivo de la fila, y después se lee con `SELECT ... FOR UPDATE`. La prueba se repitió varias veces sin fallos: los folios salen distintos y consecutivos. |
| 27 | 19/10/2026 | 6 · Tickets | Las fotos se guardaban en `public/uploads/tickets/`: cualquiera con la URL podía verlas sin sesión. | Se movieron a `storage/fotos-tickets/` (fuera de `public/`) y se sirven con `GET /fotos/:id`, que verifica permisos (`FotoService`). La prueba «no son archivos públicos» comprueba que la URL estática ya no existe. |
| 28 | 19/10/2026 | 6 · Tickets | La cancelación del admin exige un motivo y la reasignación debe quedar en el historial, pero `ticket_historiales` no tenía dónde guardar texto. | Nueva migración con la columna `comentario` (SC-04). Las reasignaciones se registran con el mismo estado anterior y nuevo; el portal las omite. |
| 29 | 19/10/2026 | 6 · Tickets | Si la validación del formulario fallaba **después** de que Multer guardó las fotos (ej. diagnóstico vacío), los archivos quedaban huérfanos en el disco. | Manejador de errores `limpiarFotosSiFalla` al final del router de tickets; además `TicketService.crear` las borra si la transacción falla. Lo verifican tres pruebas que cuentan los archivos de la carpeta. |
| 30 | 19/10/2026 | 6 · Tickets | `fecha_estimada` (DATE) se mostraba **un día antes**: `new Date('2026-09-18')` se interpreta a medianoche UTC, que en El Salvador todavía es el día 17. | `formatoFecha` muestra las fechas `AAAA-MM-DD` sin convertirlas a Date; las fechas con hora se formatean en la zona `America/El_Salvador`. |
| 31 | 19/10/2026 | 6 · Tickets | Al editar archivos con scripts de la terminal (Git Bash en Windows), algunas barras invertidas de expresiones regulares se perdieron (`\d` quedó como `d`), igual que en la incidencia 20. Afectó a `formatoFecha` y a una prueba de `FolioService`. | Se detectó al probar cada cambio; los archivos con expresiones regulares se editan directamente y no con scripts de la terminal. |
| 32 | 19/10/2026 | 6 · Tickets | Una prueba de búsqueda fallaba porque el *placeholder* del buscador ("Ej. TT-2026-0040 o Ana") contiene un folio. | Las pruebas revisan las celdas de la tabla (`<td>TT-...</td>`), no el texto de toda la página. |
| 33 | 19/10/2026 | 6 · Tickets | `npm run db:reset` falló con un error de llave foránea (`notificaciones_ibfk_1`) después de usar la aplicación: los seeders, al revertirse, solo borran sus propias filas, y las notificaciones que la app creó sobre un ticket de ejemplo (al reasignarlo y cancelarlo) impedían borrar ese ticket. La base quedó a medio revertir. | `db:reset` ahora borra y vuelve a crear la base (`db:drop` + `db:create` + `db:migrate` + `db:seed:all`), así no depende de qué datos haya creado la aplicación; también reemplaza la solución de la incidencia 6. Se verificó con la base que había fallado. |
| 34 | 20/10/2026 | 7 · Cotizaciones | Las notificaciones las crea el listener **después** del commit y de forma asíncrona (EventEmitter no espera a sus manejadores), así que las pruebas a veces revisaban la base antes de que existieran. | `NotificacionListener` guarda la promesa de cada tarea en curso y expone `esperar()`; las pruebas la llaman antes de contar notificaciones. En la aplicación el aviso aparece en milisegundos y el contador se actualiza con la consulta de cada 30 s. |
| 35 | 20/10/2026 | 7 · Cotizaciones | Con RN-09 revisado después del estado del ticket, intentar una segunda cotización daba "Solo se puede cotizar un ticket Diagnosticado…" en lugar de explicar que ya hay una Pendiente (el ticket ya está en Esperando aprobación). | `CotizacionService.crear` revisa primero si hay una cotización Pendiente. |
| 36 | 20/10/2026 | 7 · Cotizaciones | La primera versión de `editar` pedía `FOR UPDATE` sobre una consulta con `include` del ticket usando la opción `lock.of`, que solo existe en PostgreSQL. | Se bloquea solo la fila de la cotización y el ticket se lee aparte. |
| 37 | 20/10/2026 | 7 · Cotizaciones | `CotizacionService` necesita `TicketService` (permisos) y el listado de tickets necesitaba una subconsulta de cotizaciones: definirla en `CotizacionService` creaba una dependencia circular entre los dos módulos. | La subconsulta "Pendiente desde" (RN-05) vive en `TicketService`; el cálculo de vencimiento es una función pura en `utils/cotizaciones.js` que usan ambos y las vistas. |
| 38 | 20/10/2026 | 7 · Cotizaciones | Para la demo hacía falta una cotización Pendiente que **no** estuviera vencida, pero los seeders usan fechas fijas de septiembre y cualquier Pendiente aparece como "Pendiente de respuesta". | El ticket nuevo TT-2026-0043 se siembra con fechas relativas al momento de ejecutar el seeder (cotización enviada "hace 2 horas"). Las pruebas que dependían de la cantidad de tickets, clientes y del primer folio libre se ajustaron. |
| 39 | 21/10/2026 | 8 · Cierre | La demo de reportes no tenía datos: solo había un ticket Entregado (septiembre) y el reporte abre por defecto en el mes actual. | Seeder `20261021000106-tickets-entregados.js` con siete entregas de agosto y septiembre (fechas fijas, las usan las pruebas) y dos entregadas "hace unas horas" (fechas relativas). La prueba del KPI "Entregados este mes" calcula el valor esperado en lugar de fijarlo. |
| 40 | 21/10/2026 | 8 · Cierre | `npm audit` reportó 26 vulnerabilidades (4 altas). Altas: `mysql2` 3.10.2 (fuga de credenciales con `mysql_clear_password` y descompresión sin límite), incluido como copia propia de `express-mysql-session`; y `braces` / `chokidar` / `nodemon` (dev). | `overrides` en `package.json` hace que `express-mysql-session` use el mismo `mysql2` 3.24.6 del proyecto (misma versión mayor). `nodemon` se reemplazó por `node --watch` (incluido en Node 20+), porque `braces` 3.0.3 ya es la última versión y no tiene corrección. Resultado: **0 altas y 0 críticas**; se repitieron todas las pruebas. |
| 41 | 21/10/2026 | 8 · Cierre | ESLint marcó un carácter BOM literal dentro de `ReporteService` (invisible en el editor), dos variables sin usar en una prueba y un comentario `eslint-disable` innecesario. | El BOM se escribe con `String.fromCharCode(0xfeff)`; se quitaron las variables y el comentario. `npm run lint` queda sin errores ni avisos. |
| 42 | 21/10/2026 | 8 · Cierre | Revisión final: `EnConstruccionController` y su vista ya no los usaba ninguna ruta; `CotizacionService.diasDesdeEnvio` no se usaba; el controlador de tickets decidía si una cotización se podía editar; la portada pública mostraba el entorno del servidor ("development") y el texto de prueba "TecniTrack funcionando". | Se eliminaron el código sin uso; la regla pasó a `CotizacionService.puedeEditar`; la portada muestra la descripción del sistema. No se encontraron `console.log` de depuración, TODOs, secretos rastreados ni rutas sin proteger (cada router declara `requireAuth` y su rol; las públicas son login y portal). |

## 2. Limitaciones conocidas

Comportamientos o restricciones que se aceptan en esta entrega. Ninguna impide cumplir las historias de usuario.

### Reglas de negocio y funcionalidad

- **Rechazar una cotización adicional cancela el ticket completo,** igual que rechazar la primera (RN-06 tal como está escrita). Si el cliente solo rechaza el trabajo extra, hoy habría que abrir otro ticket.
- **Al editar una cotización Pendiente se toman los precios del catálogo de ese momento,** no los de la versión original.
- **La fecha estimada solo se captura al crear el ticket;** no hay pantalla para cambiarla después.
- **La regla "siempre queda un admin activo" no se puede alcanzar desde la interfaz** mientras solo exista un admin, porque antes aplica "no puedes desactivarte a ti mismo"; se prueba directamente en `UsuarioService`. Desde la interfaz solo se crean técnicos (como pide HU-09).
- **El reporte por técnico solo cuenta tickets con técnico asignado** y mide desde la primera entrada «Recibido» hasta la última «Entregado» del historial. "Servicios más solicitados" usa la fecha de la cotización (la de aprobación no se guarda aparte).
- **"Pendiente de respuesta" (RN-05) se calcula al mostrar la página:** no hay tareas programadas, porque la regla solo pide mostrarlo, nunca cancelar.
- **Las notificaciones son solo internas** (sin correo ni SMS) y el contador de la barra se actualiza cada 30 segundos.
- **El teléfono del cliente acepta solo 8 dígitos con guion opcional** (`7123-4567` o `71234567`), sin espacios ni `+503`; se guarda siempre como `0000-0000`.
- **`GET /equipos` no tiene listado propio:** redirige a `/clientes`, porque los equipos se administran dentro del detalle de cada cliente (como en el prototipo).
- **Datos de ejemplo fieles al prototipo:** la laptop Dell (DL-88291) tiene a la vez TT-2026-0039 en Listo y TT-2026-0042 en Recibido, como en las pantallas de la Fase 1.

### Interfaz

- **El select de clientes del nuevo ticket carga todos los clientes** y los filtra en el navegador: rápido para cientos de clientes; con miles convendría una búsqueda en el servidor.
- **Las fotos no se redimensionan:** se guardan como se suben (máximo `MAX_FOTO_MB`) y la galería las reduce con CSS.
- **Los errores de un formulario se muestran dos veces** (resumen arriba y mensaje junto a cada campo). Es intencional.
- **La confirmación antes de eliminar o desactivar usa `window.confirm`;** sin JavaScript el formulario se envía sin preguntar (las reglas del servidor siguen aplicándose).
- **RNF-01, RNF-03 y RNF-06 se verifican solo de forma manual** (tiempo de registro de un ticket, navegadores y vista de tablet; ver `docs/PRUEBAS.md`).

### Sesiones y seguridad

- **El rate limit guarda los contadores en memoria** (por proceso): se vacían al reiniciar el servidor y no se comparten entre varias instancias.
- **El personal y el portal comparten la cookie de sesión:** en un mismo navegador, entrar al portal cierra la sesión del técnico, y viceversa.
- **Cada visitante obtiene una sesión en MySQL** aunque no inicie sesión (el token CSRF se liga al id de sesión); las vencidas (8 h) se borran cada 15 minutos. Tras cerrar sesión, el login crea una sesión anónima nueva, sin datos del usuario anterior.
- **`requireAuth` consulta la base en cada petición** para revisar que el usuario siga activo (RN-07) y contar sus notificaciones: dos consultas por llave e índice, baratas para el tamaño de un taller.
- **El token CSRF va en la query string en los formularios con fotos,** por lo que podría quedar en los registros de un proxy; `Referrer-Policy: no-referrer` evita que se filtre a otros sitios y el logger propio no registra la query string.
- **El almacén de sesiones abre su propio pool de conexiones** (mysql2), separado del de Sequelize.

### Dependencias y entorno

- **Quedan 21 vulnerabilidades moderadas, ninguna alta ni crítica** (`npm audit`):
  - *Cadena de Jest* (`js-yaml`, `argparse`, `babel-plugin-istanbul`…): solo se usan en las pruebas. La corrección propuesta es bajar a Jest 25, incompatible con el proyecto.
  - *`uuid` < 11.1.1 dentro de Sequelize 6:* solo afecta a `v3/v5/v6` con buffer, que Sequelize no usa. La corrección propuesta es instalar Sequelize 3, incompatible.
- **`connect-flash` 0.1.1** (de 2013) usa `util.isArray`: Node 24 muestra el aviso DEP0044 al correr las pruebas. No afecta el funcionamiento.
- **Versiones mínimas del motor:** los `CHECK` se aplican desde MySQL 8.0.16 o MariaDB 10.2.1; la columna generada de RN-09 requiere MySQL 5.7 o MariaDB 10.2.
- **`database/tecnitrack.sql` se generó y se probó con MariaDB 10.4;** no se ha probado su importación en MySQL 8. Sus fechas "recientes" (TT-2026-0043 a 0045) quedan fijas en el día en que se generó; `npm run db:reset` las calcula al momento.
- **Un folio reservado en una transacción que se revierte no se pierde** (el contador también se revierte); los números de tickets borrados a mano en la base no se reutilizan.

## 3. Tareas pendientes para el siguiente sprint

Ordenadas por prioridad.

| # | Tarea | Motivo |
|---|---|---|
| 1 | Probar la importación de `database/tecnitrack.sql` en **MySQL 8** | Solo se probó en MariaDB 10.4 (limitación conocida) |
| 2 | Al rechazar una **cotización adicional**, volver a «En reparación» con la cotización anterior aprobada en lugar de cancelar el ticket | Mejora de RN-06 para el caso de trabajo extra |
| 3 | Pantalla para **editar la fecha estimada** de un ticket abierto (y avisar al cliente en el portal) | Hoy solo se captura al crear el ticket |
| 4 | Obligar al técnico a **cambiar la contraseña temporal** en su primer inicio de sesión | Hoy el admin se la comunica y el técnico la conserva |
| 5 | Pruebas automáticas de interfaz (por ejemplo con Playwright) para **RNF-01, RNF-03 y RNF-06**: tiempo de registro, varios navegadores y vista de tablet | Hoy se verifican de forma manual |
| 6 | **Notificaciones por correo o WhatsApp** al cliente cuando hay una cotización nueva o el equipo está listo | Fuera del alcance de la Fase 2 (solo notificaciones internas) |
| 7 | Guardar los contadores del **rate limit** en un almacén compartido (MySQL o Redis) | Necesario si se usan varias instancias del servidor |
| 8 | Búsqueda de clientes **en el servidor** para el formulario de nuevo ticket | Para cuando haya miles de clientes |
| 9 | Reemplazar **`connect-flash`** por un middleware propio de pocas líneas | Librería sin mantenimiento (aviso DEP0044) |
| 10 | Revisar `npm audit` cuando Sequelize y Jest publiquen versiones con `uuid` y `js-yaml` actualizados | Quedan 21 vulnerabilidades moderadas sin corrección compatible |
| 11 | Redimensionar las fotos al subirlas (miniaturas) | Reducir espacio en disco y el peso de la galería |
