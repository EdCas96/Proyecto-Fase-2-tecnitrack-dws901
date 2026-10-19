# TecniTrack

Sistema web de gestión de servicio técnico de computadoras. Permite registrar clientes y equipos, abrir tickets de reparación con fotos, generar cotizaciones que el cliente aprueba o rechaza desde un portal público (con folio + teléfono), y dar seguimiento al estado de cada reparación.

**Fase 2:** back-end y persistencia (Node.js + Express + EJS + MySQL/Sequelize).

> El prototipo estático y el Documento Maestro de la Fase 1 están en [`docs/fase1/`](docs/fase1/) (ver [Documentación de la Fase 1](#documentación-de-la-fase-1)).

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20 o superior (desarrollado con 24.19) |
| npm | 10 o superior |
| MySQL | 8.0 o superior **o** MariaDB 10.4 o superior (por ejemplo, la incluida en XAMPP) |
| Git | cualquier versión reciente |

## Instalación

1. Clona el repositorio y entra en la carpeta:
   ```bash
   git clone <url-del-repositorio> tecnitrack
   cd tecnitrack
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea tus archivos de entorno a partir de las plantillas y ajusta el usuario y la contraseña de MySQL:
   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```
   Cambia `SESSION_SECRET` en ambos por una cadena larga y aleatoria. Puedes generar una con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
4. Asegúrate de que MySQL esté corriendo (en XAMPP: botón **Start** de MySQL).
5. Crea las bases de datos de desarrollo y de pruebas:
   ```bash
   npm run db:create
   npm run db:create:test
   ```
6. Ejecuta las migraciones y carga los datos de ejemplo:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
7. Levanta el servidor:
   ```bash
   npm run dev
   ```
   Abre <http://localhost:3000>.

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución: `development`, `test` o `production` | `development` |
| `PORT` | Puerto HTTP del servidor | `3000` |
| `DB_HOST` | Host de MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_NAME` | Nombre de la base de datos | `tecnitrack` (`tecnitrack_test` en `.env.test`) |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL (vacía por defecto en XAMPP) | |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión y los tokens CSRF. **Obligatorio:** sin él la aplicación no arranca | cadena aleatoria larga |
| `DIAS_LIMITE_COTIZACION` | RN-05: días tras los que una cotización Pendiente se marca como "Pendiente de respuesta" | `7` |
| `MAX_FOTO_MB` | Tamaño máximo de cada foto subida, en MB | `5` |
| `LIMITE_INTENTOS` | Rate limit: intentos fallidos de login o portal permitidos por IP en la ventana (`0` lo desactiva) | `5` |
| `VENTANA_INTENTOS_MIN` | Rate limit: duración de la ventana, en minutos | `15` |

Con `NODE_ENV=test` la aplicación lee `.env.test`; en cualquier otro caso, `.env`. Ninguno de los dos se sube al repositorio.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta el servidor en modo normal |
| `npm run dev` | Levanta el servidor con nodemon (se reinicia al guardar) |
| `npm run db:create` | Crea la base de datos de desarrollo |
| `npm run db:create:test` | Crea la base de datos de pruebas (`tecnitrack_test`) |
| `npm run db:migrate` | Ejecuta las migraciones pendientes |
| `npm run db:seed` | Carga todos los seeders |
| `npm run db:reset` | Revierte seeders y migraciones, migra de nuevo y siembra (deja la base como recién instalada) |
| `npm run db:sql` | Regenera `database/tecnitrack.sql` a partir de la base de desarrollo |
| `npm test` | Ejecuta las pruebas (Jest + Supertest) contra `tecnitrack_test` |
| `npm run test:watch` | Ejecuta las pruebas en modo observación |

## Base de datos

### Opción A: migraciones y seeders (recomendada)

```bash
npm run db:create     # crea la base tecnitrack (utf8mb4)
npm run db:migrate    # crea las 10 tablas
npm run db:seed       # carga los datos de ejemplo
```

Para volver a empezar desde cero en cualquier momento: `npm run db:reset`.

No hace falta preparar la base de pruebas a mano: antes de cada `npm test`, `tests/setup/globalSetup.js` crea `tecnitrack_test` si no existe y reconstruye su esquema con las migraciones.

### Opción B: importar el script SQL

`database/tecnitrack.sql` contiene la creación de la base, las tablas y los datos de ejemplo:

```bash
mysql -u root -p < database/tecnitrack.sql
```

En XAMPP también se puede importar desde phpMyAdmin (pestaña **Importar**). **Atención:** el script borra la base `tecnitrack` si ya existe.

Para regenerarlo después de cambiar migraciones o seeders:

```bash
npm run db:reset
npm run db:sql
```

`db:sql` ejecuta `mysqldump` y quita de los INSERT la columna generada `cotizaciones.pendiente_ticket_id`, para que el script también se pueda importar en MySQL 8. Busca `mysqldump` en la variable `MYSQLDUMP_PATH`, después en `C:\xampp\mysql\bin\` y, si no lo encuentra ahí, en el PATH. El comando equivalente sin limpiar es:

```bash
mysqldump -u root -p --databases tecnitrack --add-drop-database --skip-dump-date --default-character-set=utf8mb4 --routines --triggers --complete-insert > database/tecnitrack.sql
```

### Tablas

`usuarios`, `clientes`, `equipos`, `catalogo_items`, `tickets`, `ticket_fotos`, `ticket_historiales`, `cotizaciones`, `cotizacion_items`, `notificaciones`. La relación con los requerimientos está en [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md).

Además, `sesiones` guarda las sesiones de inicio de sesión (express-mysql-session). `npm run db:sql` exporta solo su estructura; si usas el comando `mysqldump` directo, agrega `--ignore-table=tecnitrack.sesiones` o ejecuta antes `npm run db:reset`.

## Rutas

Cada módulo tiene su router en `routes/` y su prefijo en `routes/index.js`. Ya funcionan el login, el portal, los paneles de inicio y los módulos de administración (clientes y equipos, catálogo y usuarios). Tickets, cotizaciones, reportes y notificaciones responden una página "en construcción" (ya protegida por sesión y rol) y se implementan en los siguientes pasos.

| Prefijo | Módulo | Acceso |
|---|---|---|
| `/` | Inicio (con sesión abierta lleva al panel del rol) | público |
| `/login`, `/logout` | Inicio y cierre de sesión del personal | público |
| `/portal` | Portal del cliente (folio + teléfono); `/portal/ticket` tras validar | público |
| `/admin` | Panel del administrador | admin |
| `/tecnico` | Panel del técnico (mis tickets) | técnico (y admin) |
| `/clientes`, `/equipos` | Clientes y sus equipos (`/equipos` redirige a `/clientes`) | admin (técnico: lectura) |
| `/tickets` | Tickets | admin y técnico (solo los suyos) |
| `/cotizaciones` | Cotizaciones | admin y técnico |
| `/catalogo` | Servicios y repuestos | admin (técnico: lectura) |
| `/usuarios` | Técnicos | admin |
| `/reportes` | Reportes | admin |
| `/notificaciones` | Notificaciones | admin y técnico |

Sin sesión, las rutas protegidas redirigen a `/login` (o responden 401 si la petición es JSON); con un rol sin permiso responden 403 "No tienes permiso para acceder a esta sección".

Los formularios envían el token CSRF en el campo oculto `_csrf` y simulan `PUT`, `PATCH` o `DELETE` con el campo oculto `_method`. En [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) están el orden de los middlewares y cómo se manejan los errores.

## Módulos de administración

Entra como **admin** (`admin@tecnitrack.com` / `Tecni2026!`). Todos los listados usan la misma tabla del prototipo, paginan de 10 en 10 en la consulta (RNF-04) y muestran migas de pan. Cada acción deja un mensaje de éxito o de error; si un formulario tiene errores, regresa con los datos escritos y el mensaje junto a cada campo. Eliminar o desactivar pide confirmación.

| Módulo | Qué se puede hacer | Reglas que se pueden probar |
|---|---|---|
| **Clientes** (`/clientes`) | Buscar por nombre o teléfono (con o sin guion), crear un cliente con su primer equipo opcional, ver el detalle con sus equipos, editar y eliminar. | Teléfono de 8 dígitos (`7123-4567` o `71234567`); correo opcional pero válido; no se elimina un cliente con equipos (prueba con *Ana Lucía Martínez*). Si el equipo del nuevo cliente falla (por ejemplo, número de serie `DL-88291`, que ya existe), **no se guarda nada**. |
| **Equipos** (desde el detalle del cliente) | Agregar, editar y eliminar. | Número de serie único; no se elimina un equipo con tickets (prueba con la *Dell Inspiron 15* de María). |
| **Catálogo** (`/catalogo`) | Filtrar por tipo y buscar, crear, editar, desactivar/activar y eliminar. | Precio mayor a 0 con máximo 2 decimales; nombre único; los 6 ítems de ejemplo ya se usaron en cotizaciones, así que solo se pueden **desactivar** (un ítem nuevo sí se puede eliminar). Solo los activos se podrán cotizar. |
| **Usuarios** (`/usuarios`, solo admin) | Crear técnicos con contraseña temporal, editar nombre y correo, activar/desactivar, restablecer la contraseña y eliminar cuentas sin historial. | Contraseña de al menos 8 caracteres con letra y número; correo único; el admin no puede desactivarse a sí mismo y siempre debe quedar un admin activo; un técnico desactivado no puede iniciar sesión y, si tenía la sesión abierta, sale en su siguiente clic. |

Como **técnico** (`luis.fernandez@tecnitrack.com`), clientes y catálogo se ven sin botones de crear, editar ni eliminar; esas rutas responden 403, igual que `/usuarios`.

## Usuarios de prueba

Todos usan la contraseña **`Tecni2026!`**.

| Rol | Nombre | Correo | Estado |
|---|---|---|---|
| admin | Administrador Principal | `admin@tecnitrack.com` | Activo |
| tecnico | Luis Fernández | `luis.fernandez@tecnitrack.com` | Activo |
| tecnico | Jorge Pineda | `jorge.pineda@tecnitrack.com` | Activo |
| tecnico | Óscar Meléndez | `oscar.melendez@tecnitrack.com` | **Inactivo** (no puede iniciar sesión, RN-07) |

### Cómo iniciar sesión

1. Abre `http://localhost:3000/login`.
2. Entra con el correo de la tabla y la contraseña `Tecni2026!`:
   - **Administrador:** `admin@tecnitrack.com`. Llega a `/admin` y ve el menú completo (Dashboard, Clientes, Tickets, Catálogo, Usuarios, Reportes).
   - **Técnico:** `luis.fernandez@tecnitrack.com` o `jorge.pineda@tecnitrack.com`. Llega a `/tecnico`; si intenta abrir `/admin`, `/usuarios` o `/reportes` recibe 403.
   - **Técnico inactivo:** `oscar.melendez@tecnitrack.com` recibe "Cuenta desactivada, contacte al administrador".
3. "Cerrar sesión" (barra superior) elimina la sesión y regresa a `/login`.

Tras **5 intentos fallidos en 15 minutos** desde la misma IP, el login responde 429 hasta que pase la ventana (lo mismo para el portal). Se ajusta con `LIMITE_INTENTOS` y `VENTANA_INTENTOS_MIN` en `.env` (`LIMITE_INTENTOS=0` lo desactiva); reiniciar el servidor también vacía los contadores.

### Cómo entrar al portal del cliente

1. Abre `http://localhost:3000/portal` (o el botón "Consultar mi ticket (Cliente)" del login).
2. Escribe un folio y el teléfono del cliente dueño del equipo, por ejemplo:
   - Folio **`TT-2026-0040`**, teléfono **`7345-6720`** (Ana Lucía Martínez, *Esperando aprobación*).
   - El teléfono se acepta con o sin guion o espacios (`73456720`, `7345 6720`).
3. Con un teléfono o folio incorrecto el mensaje es siempre "No se encontró un ticket con esos datos".

### Datos de ejemplo para el portal del cliente

| Folio | Cliente (teléfono) | Equipo | Estado | Técnico | Cotización |
|---|---|---|---|---|---|
| TT-2026-0035 | María Elena Hernández (7123-4567) | Laptop Dell Inspiron 15 | Entregado | Luis Fernández | Aprobada $25.00 |
| TT-2026-0037 | Ana Lucía Martínez (7345-6720) | Impresora Epson L3250 | En reparación | Jorge Pineda | Aprobada $45.00 |
| TT-2026-0038 | Carlos Alberto Ramírez (7234-8912) | Computadora HP Pavilion TP01 | Cancelado | Jorge Pineda | Rechazada $85.00 |
| TT-2026-0039 | María Elena Hernández (7123-4567) | Laptop Dell Inspiron 15 | Listo | Jorge Pineda | Aprobada $45.00 |
| TT-2026-0040 | Ana Lucía Martínez (7345-6720) | Laptop Lenovo ThinkPad E14 | Esperando aprobación | Luis Fernández | **Pendiente** $60.00 (desde el 12/09/2026, ya supera `DIAS_LIMITE_COTIZACION`) |
| TT-2026-0041 | Carlos Alberto Ramírez (7234-8912) | Computadora HP Pavilion TP01 | Diagnosticado | Luis Fernández | — |
| TT-2026-0042 | María Elena Hernández (7123-4567) | Laptop Dell Inspiron 15 | Recibido | Sin asignar | — |

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): capas, carpetas y recorrido de una petición.
- [`docs/DEPENDENCIAS.md`](docs/DEPENDENCIAS.md): para qué sirve cada dependencia.
- [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md): historias de usuario, requerimientos, tablas, código y pruebas.
- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md): cada medida de seguridad y qué riesgo mitiga.
- [`docs/CAMBIOS_FASE2.md`](docs/CAMBIOS_FASE2.md): solicitudes de cambio respecto a la Fase 1.
- [`docs/INCIDENCIAS.md`](docs/INCIDENCIAS.md): incidencias, limitaciones y pendientes.

## Documentación de la Fase 1

Los entregables de la Fase 1 se conservan como referencia en `docs/fase1/`:

| Ruta | Contenido |
|---|---|
| [`docs/fase1/TecniTrack_Documento_Maestro.docx`](docs/fase1/TecniTrack_Documento_Maestro.docx) | Documento Maestro: requerimientos, historias de usuario, diagrama entidad-relación y diccionario de datos. |
| [`docs/fase1/prototipo/`](docs/fase1/prototipo/) | Prototipo estático HTML/CSS (`index.html`, `admin/`, `tecnico/`, `cliente/`, `css/`, `img/`), referencia visual para las vistas EJS. |

Para ver el prototipo basta con abrir `docs/fase1/prototipo/index.html` en el navegador; no lo sirve la aplicación Express. Los cambios introducidos en la Fase 2 respecto a estos documentos se registran en [`docs/CAMBIOS_FASE2.md`](docs/CAMBIOS_FASE2.md).
