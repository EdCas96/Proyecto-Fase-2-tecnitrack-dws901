# Dependencias

## Producción

| Paquete | Para qué sirve |
|---|---|
| `express` | Framework HTTP: rutas, middlewares y respuestas (versión 5). |
| `ejs` | Motor de plantillas para renderizar las vistas HTML en el servidor. |
| `express-ejs-layouts` | Layout común (cabecera, navegación, pie) para todas las vistas EJS. |
| `sequelize` | ORM: define los modelos, relaciones, consultas y transacciones sobre MySQL. |
| `mysql2` | Driver de MySQL que Sequelize usa para conectarse a la base de datos. |
| `express-session` | Manejo de sesiones de usuario (admin y técnico) mediante cookie. |
| `express-mysql-session` | Guarda las sesiones en MySQL en lugar de en memoria, para que sobrevivan a los reinicios. |
| `bcrypt` | Hash seguro de contraseñas (RN-08). |
| `multer` | Recepción de archivos `multipart/form-data` para las fotos de los tickets. |
| `dotenv` | Carga las variables de `.env` / `.env.test` en `process.env`. |
| `express-validator` | Validación y saneamiento de los datos de los formularios. |
| `connect-flash` | Mensajes de una sola vez (éxito/error) entre una redirección y la siguiente vista. |
| `method-override` | Permite enviar `PUT`/`PATCH`/`DELETE` desde formularios HTML, que solo admiten `GET`/`POST`. |
| `express-rate-limit` | Limita los intentos por IP en el login y en el portal del cliente. |
| `helmet` | Agrega cabeceras HTTP de seguridad (CSP, X-Frame-Options, etc.). |
| `csrf-csrf` | Protección CSRF (patrón *double submit cookie*) para todos los formularios. |
| `cookie-parser` | Lee las cookies de la petición; lo necesita `csrf-csrf`. |

## Desarrollo

| Paquete | Para qué sirve |
|---|---|
| `sequelize-cli` | Crea la base de datos y ejecuta migraciones y seeders desde la terminal. |
| `jest` | Framework de pruebas unitarias y de integración. |
| `supertest` | Hace peticiones HTTP a `app.js` dentro de las pruebas sin levantar el puerto. |
| `cross-env` | Define `NODE_ENV=test` en los scripts de forma compatible con Windows, macOS y Linux. |
| `eslint`, `@eslint/js`, `globals` | Revisión estática del código (`npm run lint`); configuración en `eslint.config.js`. |

`npm run dev` usa `node --watch` (incluido en Node 20+) para reiniciar el servidor al guardar; antes se usaba `nodemon`, que se quitó porque arrastraba una vulnerabilidad alta sin corrección (ver INCIDENCIAS).
