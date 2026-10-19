# TecniTrack

Sistema web de gestión de servicio técnico de computadoras. Un taller registra clientes y equipos, abre tickets de reparación con fotos, genera cotizaciones con su catálogo de servicios y repuestos, y da seguimiento a cada reparación por un flujo de estados controlado. El cliente, sin crear cuenta, consulta su ticket con **folio + teléfono** y aprueba o rechaza la cotización desde un portal público; el técnico recibe una notificación en cuanto el cliente responde.

**Proyecto universitario — DWS901, Fase 2 (Sprint II): back-end y persistencia.** El prototipo y el Documento Maestro de la Fase 1 están en [`docs/fase1/`](docs/fase1/).

## Contenido

1. [Tecnologías](#tecnologías)
2. [Requisitos](#requisitos)
3. [Instalación paso a paso](#instalación-paso-a-paso)
4. [Configuración del `.env`](#configuración-del-env)
5. [Base de datos](#base-de-datos)
6. [Ejecutar la aplicación](#ejecutar-la-aplicación)
7. [Pruebas, cobertura y lint](#pruebas-cobertura-y-lint)
8. [Usuarios de prueba](#usuarios-de-prueba)
9. [Folios de ejemplo para el portal](#folios-de-ejemplo-para-el-portal)
10. [Módulos implementados](#módulos-implementados)
11. [Estructura de carpetas](#estructura-de-carpetas)
12. [Documentación](#documentación)
13. [Problemas frecuentes](#problemas-frecuentes)

## Tecnologías

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + **Express 5** |
| Vistas | **EJS** renderizadas en el servidor, con `express-ejs-layouts` (layout y parciales) |
| Base de datos | **MySQL / MariaDB** con **Sequelize 6**; esquema con **sequelize-cli** (migraciones y seeders, nunca `sync()`) |
| Sesión y autenticación | `express-session` guardada en MySQL (`express-mysql-session`) + **bcrypt** |
| Seguridad | `helmet`, **csrf-csrf** (CSRF), `express-rate-limit` (login y portal) |
| Formularios y archivos | **express-validator**, `method-override`, **Multer** (fotos) |
| Configuración | **dotenv** (`.env` y `.env.test`) |
| Pruebas | **Jest** + **Supertest**, con una base de datos de pruebas separada |
| Calidad | **ESLint 9** |

Arquitectura MVC por capas: `routes → middlewares → controllers → services (lógica de negocio) → models`. Detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md); para qué sirve cada paquete, en [`docs/DEPENDENCIAS.md`](docs/DEPENDENCIAS.md).

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | **20 o superior** (desarrollado y probado con 24.19.0) |
| npm | **10 o superior** (probado con 11.17.0) |
| MySQL o MariaDB | **MySQL 8.0.16+** o **MariaDB 10.4+** (probado con la MariaDB 10.4.32 de XAMPP) |
| Git | cualquier versión reciente |

> Con MySQL anterior a 8.0.16 las restricciones `CHECK` se ignoran (las validaciones del modelo siguen activas).

## Instalación paso a paso

> **Windows / PowerShell:** si al escribir `npm` aparece *"no se puede cargar el archivo ...\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema"*, tienes dos opciones:
> - usar `npm.cmd` en lugar de `npm` en todos los comandos (por ejemplo `npm.cmd install`, `npm.cmd run dev`), o
> - permitir los scripts firmados para tu usuario, una sola vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
>
> Las dos funcionan igual. También puedes usar **Git Bash** o **CMD**, que no tienen esa restricción.

1. **Clona el repositorio** y entra en la carpeta:
   ```bash
   git clone https://github.com/EdCas96/Proyecto-Fase-2-tecnitrack-dws901.git tecnitrack
   cd tecnitrack
   ```
2. **Instala las dependencias:**
   ```bash
   npm install
   ```
   Si npm 11 avisa que bloqueó los scripts de instalación de `bcrypt`, no pasa nada: `bcrypt` 6 trae binarios ya compilados (ver [Problemas frecuentes](#problemas-frecuentes)).
3. **Crea los archivos de entorno** a partir de las plantillas:
   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```
   En PowerShell: `Copy-Item .env.example .env` y `Copy-Item .env.test.example .env.test`.
4. **Edita `.env` y `.env.test`**: el usuario y la contraseña de MySQL y un `SESSION_SECRET` largo y aleatorio en cada uno (ver [Configuración del `.env`](#configuración-del-env)). Para generar un secreto:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
5. **Enciende MySQL** (en XAMPP: botón **Start** de MySQL).
6. **Crea la base de datos con sus tablas y datos de ejemplo** (opción A, recomendada):
   ```bash
   npm run db:create
   npm run db:migrate
   npm run db:seed
   ```
   O importa el script SQL (opción B, ver [Base de datos](#base-de-datos)).
7. **Arranca el servidor:**
   ```bash
   npm run dev
   ```
   Abre <http://localhost:3000> y entra con un [usuario de prueba](#usuarios-de-prueba).
8. **(Opcional) Comprueba que todo funciona** ejecutando las pruebas: `npm test`. La base de pruebas `tecnitrack_test` se crea sola.

## Configuración del `.env`

`.env` (desarrollo) y `.env.test` (pruebas) **nunca se suben al repositorio**. Con `NODE_ENV=test` la aplicación lee `.env.test`; en cualquier otro caso, `.env`.

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno: `development`, `test` o `production` | `development` |
| `PORT` | Puerto HTTP | `3000` (`3001` en `.env.test`) |
| `DB_HOST` | Host de MySQL | `127.0.0.1` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `DB_NAME` | Base de datos | `tecnitrack`; en `.env.test` **debe terminar en `_test`** (`tecnitrack_test`) |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL (vacía por defecto en XAMPP) | |
| `SESSION_SECRET` | Firma la cookie de sesión y los tokens CSRF. **Obligatorio:** sin él la aplicación no arranca | cadena aleatoria larga |
| `DIAS_LIMITE_COTIZACION` | RN-05: días tras los que una cotización Pendiente se muestra como "Pendiente de respuesta" | `7` |
| `MAX_FOTO_MB` | Tamaño máximo de cada foto, en MB | `5` |
| `DIRECTORIO_FOTOS` | (Opcional) carpeta de las fotos; por defecto `storage/fotos-tickets` (fuera de `public/`) | `storage/fotos-tickets` |
| `LIMITE_INTENTOS` | Intentos fallidos de login o portal permitidos por IP en la ventana (`0` lo desactiva) | `5` |
| `VENTANA_INTENTOS_MIN` | Duración de la ventana del rate limit, en minutos | `15` |

Las pruebas se niegan a ejecutarse si `DB_NAME` de `.env.test` no termina en `_test`, para no borrar por error la base de desarrollo.

## Base de datos

**Tablas:** `usuarios`, `clientes`, `equipos`, `catalogo_items`, `tickets`, `ticket_fotos`, `ticket_historiales`, `cotizaciones`, `cotizacion_items`, `notificaciones`, más `folio_contadores` (contador de folios por año) y `sesiones` (sesiones de inicio de sesión). Los cambios respecto al modelo de la Fase 1 están en [`docs/CAMBIOS_FASE2.md`](docs/CAMBIOS_FASE2.md).

### Opción A: migraciones y seeders (recomendada)

```bash
npm run db:create     # crea la base tecnitrack (utf8mb4_unicode_ci)
npm run db:migrate    # crea las tablas (15 migraciones)
npm run db:seed       # carga los datos de ejemplo (6 seeders)
```

Para dejar la base como recién instalada en cualquier momento: `npm run db:reset` (borra la base, la crea, migra y siembra; **se pierden los datos que hayas creado**).

Si ya tenías la base de un paso anterior, `npm run db:migrate` aplica solo las migraciones nuevas sin borrar tus datos.

### Opción B: importar el script SQL

`database/tecnitrack.sql` crea la base `tecnitrack`, todas las tablas y los datos de ejemplo:

```bash
mysql -u root -p < database/tecnitrack.sql
```

En XAMPP también se puede importar desde phpMyAdmin (pestaña **Importar**). **Atención:** el script borra la base `tecnitrack` si ya existe. Para regenerarlo después de cambiar migraciones o seeders: `npm run db:reset` y luego `npm run db:sql`.

> Con la opción B las fechas "recientes" de los datos de ejemplo (la cotización lista para aprobar y las entregas del mes) quedan fijas en el día en que se generó el script. Con `npm run db:reset` se calculan respecto al momento de sembrar.

## Ejecutar la aplicación

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con `node --watch`: se reinicia al guardar un archivo `.js` |
| `npm start` | Servidor normal (sin reinicio automático) |

La aplicación queda en <http://localhost:3000> (o el `PORT` de `.env`). Al arrancar muestra en la terminal si la conexión a MySQL es correcta.

Otros comandos de base de datos: `npm run db:create:test` (crea la base de pruebas a mano; normalmente no hace falta) y `npm run db:sql` (regenera el script SQL).

## Pruebas, cobertura y lint

```bash
npm test                # 533 pruebas (Jest + Supertest) contra tecnitrack_test
npm run test:coverage   # lo mismo y el reporte de cobertura (también en coverage/index.html)
npm run lint            # ESLint
```

- No hay que preparar la base de pruebas: antes de cada ejecución, `tests/setup/globalSetup.js` crea `tecnitrack_test` si no existe y reconstruye el esquema con las migraciones. Cada archivo de pruebas carga sus datos con los seeders.
- Resultado actual: **533 pruebas en 23 archivos, todas pasan**; cobertura de **94 % de sentencias y 96 % de líneas**.
- Estrategia, conteo por módulo, cobertura y pruebas manuales: [`docs/PRUEBAS.md`](docs/PRUEBAS.md).

## Usuarios de prueba

Todos usan la contraseña **`Tecni2026!`**. Inicia sesión en <http://localhost:3000/login>.

| Rol | Nombre | Correo | Qué ve |
|---|---|---|---|
| admin | Administrador Principal | `admin@tecnitrack.com` | Todo: dashboard, clientes, tickets, catálogo, usuarios, reportes |
| técnico | Luis Fernández | `luis.fernandez@tecnitrack.com` | Sus tickets y notificaciones; clientes y catálogo solo lectura |
| técnico | Jorge Pineda | `jorge.pineda@tecnitrack.com` | Igual que Luis, con sus propios tickets |
| técnico | Óscar Meléndez | `oscar.melendez@tecnitrack.com` | **Inactivo:** recibe "Cuenta desactivada, contacte al administrador" (RN-07) |

Tras **5 intentos fallidos en 15 minutos** desde la misma IP, el login (y el portal) responden 429. Reiniciar el servidor vacía los contadores.

## Folios de ejemplo para el portal

Portal del cliente: <http://localhost:3000/portal>. El teléfono se acepta con o sin guion (`7345-6720` o `73456720`).

| Folio | Teléfono | Cliente | Estado | Para probar |
|---|---|---|---|---|
| **TT-2026-0043** | **7456-1230** | José Antonio Pérez | Esperando aprobación | Cotización Pendiente de $65.00 **lista para aprobar o rechazar** |
| TT-2026-0040 | 7345-6720 | Ana Lucía Martínez | Esperando aprobación | Cotización **Pendiente de respuesta** (de septiembre, RN-05) |
| TT-2026-0037 | 7345-6720 | Ana Lucía Martínez | En reparación | Cotización aprobada; historial con el paso por el cliente |
| TT-2026-0039 | 7123-4567 | María Elena Hernández | Listo | Fecha estimada y historial |
| TT-2026-0038 | 7234-8912 | Carlos Alberto Ramírez | Cancelado | Cotización rechazada |
| TT-2026-0035 | 7123-4567 | María Elena Hernández | Entregado | Flujo completo |

Con un folio o teléfono incorrecto el mensaje es siempre "No se encontró un ticket con esos datos". Otros tickets de ejemplo: *TT-2026-0041* (Luis, Diagnosticado, listo para cotizar), *TT-2026-0042* (Recibido, sin asignar) y *TT-2026-0028* a *0034*, *0044* y *0045* (entregados, para los reportes). El siguiente ticket que se cree será el **TT-2026-0046**.

## Módulos implementados

| Módulo | Rutas | Historias | Resumen |
|---|---|---|---|
| Autenticación y roles | `/login`, `/logout` | HU-09 | Sesión en MySQL, `session.regenerate()`, mensaje genérico, rate limit, el usuario desactivado sale en su siguiente clic |
| Portal del cliente | `/portal`, `/portal/ticket` | HU-04, HU-05 | Folio + teléfono; estado, fecha estimada, historial y la cotización con Aprobar / Rechazar |
| Dashboards | `/admin`, `/tecnico` | HU-08, HU-10 | KPIs del prototipo, tickets recientes, alerta de respuestas de cotización |
| Clientes y equipos | `/clientes`, `/equipos` | HU-01 | CRUD, búsqueda y paginación; nuevo cliente con su primer equipo en una transacción; historial de tickets |
| Catálogo | `/catalogo` | HU-07 | Filtro por tipo, precio > 0 con 2 decimales, desactivar los ítems ya usados |
| Usuarios | `/usuarios` | HU-09 | Crear técnicos con contraseña temporal, activar/desactivar, restablecer contraseña |
| Tickets | `/tickets`, `/fotos/:id` | HU-02, HU-06 | Folio correlativo seguro, fotos protegidas, máquina de estados, reasignar y cancelar |
| Cotizaciones | `/cotizaciones` | HU-03 | Ítems del catálogo activo, total en el servidor (centavos), cotización adicional, "Pendiente de respuesta" |
| Notificaciones | `/notificaciones` | HU-10 | Bus de eventos después del commit, contador en vivo, marcar como leídas |
| Reportes | `/reportes` | HU-08 | Tickets por técnico y tiempo promedio, servicios más solicitados, resumen por estado, CSV |

Matriz de acceso: el **admin** puede todo; el **técnico** ve y modifica solo sus tickets y cotizaciones, consulta clientes y catálogo sin modificarlos y no entra a usuarios ni reportes (403); el **cliente** solo usa el portal. Detalle de cada historia, regla y prueba en [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md).

## Estructura de carpetas

```
tecnitrack/
├── app.js                 # Configuración de Express (middlewares en orden, rutas, errores)
├── server.js              # Punto de entrada: prueba la conexión y levanta el puerto
├── config/                # env.js (.env/.env.test), config.js (sequelize-cli), database.js, sesion.js
├── routes/                # Un router por módulo; index.js los monta en su prefijo
├── middlewares/           # auth (sesión y roles), csrf, validar, upload (Multer), errorHandler, logger…
├── controllers/           # Reciben la petición, llaman al servicio y responden
├── services/              # Lógica de negocio (clases): TicketService, CotizacionService, FolioService…
│   └── eventos/           # Bus de eventos (EventEmitter) y NotificacionListener
├── models/                # Modelos de Sequelize y sus asociaciones
├── validators/            # Reglas de express-validator por módulo
├── utils/                 # Errores propios, asyncHandler, constantes, paginación, cálculos…
├── views/                 # EJS: layouts/, partials/, errores/ y una carpeta por módulo
├── public/                # css/, img/, js/ (scripts del navegador)
├── storage/               # Fotos subidas (no versionadas; fuera de public/)
├── migrations/            # 15 migraciones (esquema)
├── seeders/               # 6 seeders (datos de ejemplo)
├── database/              # tecnitrack.sql y su generador
├── tests/                 # unit/, integration/, helpers/ y setup/ (Jest)
└── docs/                  # Documentación del proyecto y entregables de la Fase 1
```

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Capas, carpetas, orden de los middlewares, manejo de errores, eventos y recorrido de una petición |
| [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md) | HU-01 a HU-10, RF-01 a RF-12, RN-01 a RN-09 y RNF-01 a RNF-06 con su ruta, servicio y prueba |
| [`docs/PRUEBAS.md`](docs/PRUEBAS.md) | Estrategia de pruebas, conteo por módulo, cobertura y pruebas manuales |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | Cada medida de seguridad y el riesgo que mitiga |
| [`docs/CAMBIOS_FASE2.md`](docs/CAMBIOS_FASE2.md) | Solicitudes de cambio al modelo de la Fase 1 (SC-01 a SC-06) y decisiones técnicas |
| [`docs/INCIDENCIAS.md`](docs/INCIDENCIAS.md) | Incidencias resueltas, limitaciones conocidas y pendientes para el siguiente sprint |
| [`docs/DEPENDENCIAS.md`](docs/DEPENDENCIAS.md) | Para qué sirve cada dependencia |
| [`docs/fase1/`](docs/fase1/) | Documento Maestro y prototipo estático de la Fase 1 (abrir `docs/fase1/prototipo/index.html` en el navegador) |

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| PowerShell: *"la ejecución de scripts está deshabilitada"* al usar `npm` | Usa `npm.cmd` o ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `npm install` avisa que bloqueó los scripts de `bcrypt` (`allow-scripts`) | Es solo un aviso de npm 11: `bcrypt` 6 incluye binarios. Si en tu máquina falla al iniciar sesión, ejecuta `npm approve-scripts bcrypt` y `npm rebuild bcrypt` |
| `Falta SESSION_SECRET en el archivo .env` | Revisa que `.env` exista en la raíz del proyecto y tenga `SESSION_SECRET` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL no está encendido (XAMPP → Start) o el puerto de `.env` no es el correcto |
| `Access denied for user 'root'` | La contraseña de MySQL de `.env` no coincide (en XAMPP suele estar vacía) |
| El login responde "Demasiados intentos" (429) | Espera 15 minutos o reinicia el servidor (los contadores están en memoria) |
| `npm test` dice que la base debe terminar en `_test` | Revisa `DB_NAME` en `.env.test` |
