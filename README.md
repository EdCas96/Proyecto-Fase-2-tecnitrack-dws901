# TecniTrack

Sistema web de gestión de servicio técnico de computadoras. Permite registrar clientes y equipos, abrir tickets de reparación con fotos, generar cotizaciones que el cliente aprueba o rechaza desde un portal público (con folio + teléfono), y dar seguimiento al estado de cada reparación.

**Fase 2:** back-end y persistencia (Node.js + Express + EJS + MySQL/Sequelize).

> El prototipo estático de la Fase 1 sigue en `index.html`, `admin/`, `tecnico/`, `cliente/`, `css/` e `img/` como referencia visual.

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
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión y los tokens CSRF | cadena aleatoria larga |
| `DIAS_LIMITE_COTIZACION` | RN-05: días tras los que una cotización Pendiente se marca como "Pendiente de respuesta" | `7` |
| `MAX_FOTO_MB` | Tamaño máximo de cada foto subida, en MB | `5` |

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
| `npm run db:reset` | Revierte todas las migraciones, migra de nuevo y siembra |
| `npm test` | Ejecuta las pruebas (Jest + Supertest) contra `tecnitrack_test` |
| `npm run test:watch` | Ejecuta las pruebas en modo observación |

## Usuarios de prueba

*Por completar cuando se implementen los seeders de usuarios.*

| Rol | Correo | Contraseña |
|---|---|---|
| admin | — | — |
| tecnico | — | — |

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): capas, carpetas y recorrido de una petición.
- [`docs/DEPENDENCIAS.md`](docs/DEPENDENCIAS.md): para qué sirve cada dependencia.
- [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md): historias de usuario, reglas, código y pruebas.
- [`docs/INCIDENCIAS.md`](docs/INCIDENCIAS.md): incidencias, limitaciones y pendientes.
