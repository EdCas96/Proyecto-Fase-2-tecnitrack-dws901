# Incidencias, limitaciones y pendientes

## Incidencias

Problemas encontrados durante el desarrollo y cómo se resolvieron.

| # | Fecha | Paso | Incidencia | Resolución |
|---|---|---|---|---|
| 1 | 18/10/2026 | 1 · Entorno | MySQL no estaba en ejecución ni instalado como servicio en la máquina de desarrollo. | Se usó la MariaDB 10.4 que incluye XAMPP (compatible con MySQL), con usuario `root` sin contraseña. El README indica cómo arrancarla. |
| 2 | 18/10/2026 | 1 · Entorno | npm 11 avisa que bloqueó los scripts de instalación de `bcrypt` (`allow-scripts`). | `bcrypt` 6 incluye binarios precompilados y funciona sin compilar. Si en otra máquina falla, ejecutar `npm approve-scripts bcrypt` y `npm rebuild bcrypt`. |
| 3 | 18/10/2026 | 2 · Base de datos | Las bases creadas en el Paso 1 tenían cotejamiento `utf8mb4_general_ci`, porque se crearon antes de agregar `--collate` al script `db:create`. | Se borraron y recrearon (`db:drop` + `db:create`) con `utf8mb4_unicode_ci`. |
| 4 | 18/10/2026 | 2 · Base de datos | El `sql_mode` por defecto de XAMPP no es estricto: un INSERT con un ENUM inválido o sin un campo NOT NULL se aceptaba con solo un aviso (guardaba `''`). | Hook `afterConnect` en `config/config.js` que fija `STRICT_ALL_TABLES` en cada conexión. Lo verifica la prueba «ENUM rechaza un estado inexistente». |
| 5 | 18/10/2026 | 2 · Base de datos | `queryInterface.createTable` ignora en silencio `unique: 'nombre_indice'` (texto): correo, folio, número de serie y nombre de catálogo quedaron **sin índice único**. Lo detectaron las pruebas de duplicados. | Los índices únicos se crean con `addIndex(..., { unique: true, name })`. Se corrigieron las migraciones antes de fusionar a `main`. |
| 6 | 18/10/2026 | 2 · Base de datos | `db:reset` no volvía a sembrar: `migrate:undo:all` borra las tablas pero no `sequelize_data`, donde se registran los seeders ya ejecutados. | `db:reset` ejecuta primero `db:seed:undo:all`. |
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

## Limitaciones conocidas

Comportamientos o restricciones que se aceptan en esta fase.

- **Versiones mínimas del motor:** los `CHECK` solo se aplican desde MySQL 8.0.16 o MariaDB 10.2.1 (en versiones anteriores se ignoran, aunque las validaciones del modelo siguen activas). La columna generada que garantiza RN-09 requiere MySQL 5.7 o MariaDB 10.2 en adelante.
- **`database/tecnitrack.sql` se generó con MariaDB 10.4.** Se probó su importación en MariaDB; en MySQL 8 no se ha probado en esta máquina.
- **Datos de ejemplo fieles al prototipo:** la laptop Dell (DL-88291) tiene a la vez el ticket TT-2026-0039 en estado Listo y el TT-2026-0042 en Recibido, tal como aparece en las pantallas de la Fase 1. Ninguna regla de negocio lo impide.
- **La cotización Pendiente de ejemplo (TT-2026-0040) es del 12/09/2026,** así que siempre superará `DIAS_LIMITE_COTIZACION` y servirá para demostrar RN-05.
- **Los módulos (salvo login, portal y paneles) siguen mostrando "en construcción",** pero ya están protegidos por sesión y rol según la matriz de permisos.
- **El filtro "el técnico solo ve sus tickets" (RN-02) aún no se aplica a nivel de registro:** hoy el técnico entra a `/tickets` porque su rol lo permite; el filtro por `tecnico_id` se agrega con `TicketService`.
- **El rate limit guarda los contadores en memoria** (por proceso). Si el servidor se reinicia, se vacían; con varias instancias detrás de un balanceador habría que usar un almacén compartido. En producción, `trust proxy` permite identificar la IP real del cliente.
- **El personal y el portal comparten la cookie de sesión:** si en el mismo navegador alguien con sesión de técnico entra al portal, su sesión de técnico se cierra (la sesión se regenera con solo `clienteTicketId`), y viceversa.
- **`requireAuth` consulta la base en cada petición** para revisar que el usuario siga activo (RN-07). Es una consulta por llave primaria, barata para el tamaño del taller.
- **Tras cerrar sesión, la página de login vuelve a crear una sesión anónima** (necesaria para el token CSRF del formulario). No contiene datos del usuario anterior.
- **Cada visitante que abre una página obtiene una sesión en MySQL,** aunque no inicie sesión. Es necesario porque el token CSRF se liga al id de sesión. Las sesiones vencidas (8 h) se borran automáticamente cada 15 minutos; los estáticos no crean sesión.
- **`connect-flash` 0.1.1** (última versión, de 2013) usa `util.isArray`, y Node 24 muestra un aviso de deprecación (DEP0044) al ejecutar las pruebas. No afecta el funcionamiento; si una versión futura de Node elimina esa función, habrá que reemplazar la librería por un middleware propio de unas pocas líneas.
- **El almacén de sesiones abre su propio pool de conexiones** (mysql2), separado del de Sequelize. En las pruebas, `cerrarConexiones()` cierra los dos.
- **El token CSRF en la query string** (solo en formularios con fotos) podría quedar en registros de un proxy. Helmet envía `Referrer-Policy: no-referrer`, así que no se filtra a otros sitios, y el logger propio no registra la query string.

## Pendientes

Tareas identificadas que aún no se han realizado.

- [ ] `FolioService` (RN-03): generar el siguiente correlativo del año dentro de una transacción, sin duplicados ante peticiones simultáneas.
- [ ] `MaquinaEstadosTicket` y `TicketService` (RN-01, RN-02, RN-04), registrando cada cambio en `ticket_historiales`.
- [ ] Probar la importación de `database/tecnitrack.sql` en MySQL 8.
- [x] Autenticación (Paso 4): `POST /login` y `POST /logout`, middlewares de sesión y rol, y rate limit en el login y el portal. `iniciarSesion()` y `crearAgenteAutenticado()` ya se usan en `tests/integration/auth.test.js`.
- [ ] CRUD de usuarios (HU-09): al crear o cambiar la contraseña de un técnico usar `AuthService.hashPassword` (que aplica `validarFortaleza`).
- [ ] Portal: mostrar historial y cotización, y aprobar o rechazar (HU-05, RN-05, RN-06).
- [x] Versionar el prototipo y el Documento Maestro de la Fase 1: se movieron a `docs/fase1/prototipo/` y `docs/fase1/` para dejar limpia la raíz del proyecto.
