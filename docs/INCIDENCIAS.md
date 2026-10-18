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

## Limitaciones conocidas

Comportamientos o restricciones que se aceptan en esta fase.

- **Versiones mínimas del motor:** los `CHECK` solo se aplican desde MySQL 8.0.16 o MariaDB 10.2.1 (en versiones anteriores se ignoran, aunque las validaciones del modelo siguen activas). La columna generada que garantiza RN-09 requiere MySQL 5.7 o MariaDB 10.2 en adelante.
- **`database/tecnitrack.sql` se generó con MariaDB 10.4.** Se probó su importación en MariaDB; en MySQL 8 no se ha probado en esta máquina.
- **Datos de ejemplo fieles al prototipo:** la laptop Dell (DL-88291) tiene a la vez el ticket TT-2026-0039 en estado Listo y el TT-2026-0042 en Recibido, tal como aparece en las pantallas de la Fase 1. Ninguna regla de negocio lo impide.
- **La cotización Pendiente de ejemplo (TT-2026-0040) es del 12/09/2026,** así que siempre superará `DIAS_LIMITE_COTIZACION` y servirá para demostrar RN-05.

## Pendientes

Tareas identificadas que aún no se han realizado.

- [ ] `FolioService` (RN-03): generar el siguiente correlativo del año dentro de una transacción, sin duplicados ante peticiones simultáneas.
- [ ] `MaquinaEstadosTicket` y `TicketService` (RN-01, RN-02, RN-04), registrando cada cambio en `ticket_historiales`.
- [ ] Probar la importación de `database/tecnitrack.sql` en MySQL 8.
- [ ] Decidir si los archivos del prototipo de la Fase 1 (`index.html`, `admin/`, `tecnico/`, `cliente/`, `css/`, `img/`) y `TecniTrack_Documento_Maestro.docx` se versionan en el repositorio.
