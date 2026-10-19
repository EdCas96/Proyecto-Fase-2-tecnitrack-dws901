# Arquitectura

TecniTrack sigue una arquitectura **MVC por capas**. Cada capa solo conoce a la siguiente:

```
routes  ->  middlewares  ->  controllers  ->  services  ->  models  ->  MySQL
                                 |
                                 └──> views (EJS)
```

## Responsabilidad de cada carpeta

| Carpeta / archivo | Responsabilidad |
|---|---|
| `server.js` | Punto de entrada. Prueba la conexión a MySQL (`sequelize.authenticate()`) y levanta el puerto. No contiene configuración de Express. |
| `app.js` | Configura Express: vistas y la cadena de middlewares en un orden fijo (ver [Orden de los middlewares](#orden-de-los-middlewares)). Exporta `app` para que las pruebas lo usen sin abrir un puerto. |
| `config/` | `env.js` carga `.env` o `.env.test`; `config.js` es la configuración que lee sequelize-cli (incluye zona horaria UTC-6 y `sql_mode` estricto en cada conexión); `database.js` crea la instancia única de Sequelize; `sesion.js` configura express-session con el almacén en MySQL (tabla `sesiones`). |
| `routes/` | `index.js` monta un router por módulo en su prefijo (tabla en el propio archivo). Cada router asocia URL y método con sus middlewares y su controlador, y envuelve los controladores con `asyncHandler`. |
| `middlewares/` | Lógica transversal antes del controlador: `logger.js`, `csrf.js`, `variablesVistas.js`, `validar.js` (express-validator), `upload.js` (Multer), `notFound.js`, `errorHandler.js`, `auth.js` (`requireAuth`, `checkRole`, `soloLecturaPara`, `requireCliente`, `redirectIfAuth`, `sinCache`) y `limitarIntentos.js` (rate limit del login y del portal). |
| `controllers/` | Leen la petición (`req.params`, `req.body`, `req.session`), llaman al servicio y responden (render o redirección). **No** contienen reglas de negocio ni consultas a modelos. |
| `services/` | Lógica de negocio como **clases** (`TicketService`, `CotizacionService`, `FolioService`, `AuthService`, `MaquinaEstadosTicket`…). Aplican las reglas RN-xx, abren transacciones y lanzan errores propios. |
| `validators/` | Reglas de express-validator por módulo (ej. `authValidators.js`: login y portal), que las rutas pasan a `validar(...)`. |
| `models/` | Modelos de Sequelize como clases (`static inicializar()` y `static asociar()`): columnas, validaciones con mensajes en español y asociaciones. `models/index.js` los registra y exporta junto con `sequelize`. |
| `migrations/` | Cambios versionados del esquema de la base de datos (crear tablas, índices, llaves foráneas). |
| `seeders/` | Datos iniciales y de ejemplo (usuarios de prueba, catálogo, etc.). |
| `views/` | Plantillas EJS: `layouts/main.ejs` (estructura común), `partials/` (`head`, `navbar` con el menú según el rol, `breadcrumbs`, `flash`, `badgeEstado`, `footer`, `paginaError`), `errores/` (400, 403, 404, 422, 429, 500) y una carpeta por área: `admin/`, `tecnico/`, `cliente/`, `auth/`. |
| `public/` | Archivos estáticos servidos tal cual: `css/`, `js/` y `uploads/` (fotos subidas en `uploads/tickets/`, no versionadas). |
| `utils/` | Utilidades sin estado: `asyncHandler.js`, `constantes.js` (estados, colores semánticos, roles, tipos, formato de folio), `vistas.js` (funciones disponibles en todas las vistas: color y etiqueta de estado, menú por rol), `traducirError.js` y las clases de error en `utils/errors/`. |
| `tests/` | `unit/` prueba clases y funciones aisladas; `integration/` prueba modelos, middlewares y rutas completas con Supertest contra `tecnitrack_test`; `helpers/` tiene fábricas de datos, limpieza de tablas, el agente con sesión y CSRF (`agente.js`) y una mini app para probar middlewares sueltos (`appPrueba.js`); `setup/globalSetup.js` reconstruye el esquema de pruebas con las migraciones. |
| `database/` | `tecnitrack.sql`: script completo (base, tablas y datos de ejemplo) generado con `npm run db:sql` (`generar-sql.js`) a partir de las migraciones y seeders. |
| `docs/` | Documentación del proyecto. |

## Orden de los middlewares

`app.js` registra los middlewares en este orden. Cada uno depende de lo que dejaron los anteriores, así que cambiarlo de lugar rompe algo:

| # | Middleware | Por qué va aquí |
|---|---|---|
| 0 | `logger` (no en pruebas) | Primero, para medir el tiempo completo de cada petición y registrarla aunque un middleware posterior falle. Registra la ruta sin la query string, para no dejar tokens en el log. |
| 1 | `helmet` | Las cabeceras de seguridad (CSP, `X-Frame-Options`, `nosniff`…) deben aplicarse a **todas** las respuestas, incluidos los estáticos y las páginas de error. |
| – | `express.static` | Antes de la sesión: pedir CSS o imágenes no debe leer ni crear sesiones en MySQL. Después de helmet, para que también lleve sus cabeceras. |
| 2 | `express.urlencoded` / `express.json` (100 kb) | Llenan `req.body`, que necesitan method-override y CSRF (campo `_csrf`). El límite rechaza cuerpos enormes antes de procesarlos (413). Los formularios con fotos (multipart) no los lee este middleware sino Multer, en la ruta. |
| 3 | `cookie-parser` | csrf-csrf lee su cookie de `req.cookies`. |
| 4 | `method-override` | Necesita `req.body._method`. Solo convierte `POST` en `PUT`, `PATCH` o `DELETE`, nunca en `GET`, porque `GET` no se verifica contra CSRF. Va **antes** de CSRF para que la verificación vea el método final. |
| 5 | `express-session` (MySQL) | La necesitan flash, CSRF (el token se liga al id de sesión) y las vistas (usuario en sesión). Cookie `httpOnly`, `sameSite=lax`, `secure` en producción, 8 horas. |
| 6 | `connect-flash` | Guarda los mensajes en la sesión, así que va después de ella. |
| 7 | `csrf-csrf` | Necesita cookies, cuerpo y sesión. Rechaza con 403 cualquier `POST`, `PUT`, `PATCH` o `DELETE` sin un token válido **antes** de llegar a cualquier ruta. |
| 8 | `variablesVistas` | Pone en `res.locals` el usuario de sesión (solo `id`, `nombre`, `correo` y `rol`), los mensajes flash, los errores y datos del formulario anterior, y el token CSRF. Va al final porque usa todo lo anterior. |
| – | Rutas (`routes/index.js`) | Cada router agrega sus propios middlewares: `requireAuth` + `checkRole`/`soloLecturaPara` (con `router.use`, antes de todas sus rutas), `limitarLogin`/`limitarPortal`, `validar` y `subirFotos`. Las medidas de seguridad se explican en [`SEGURIDAD.md`](SEGURIDAD.md). |
| 9 | `notFound` | Solo se ejecuta si ninguna ruta respondió. |
| 10 | `errorHandler` | Siempre el último: Express solo envía a un middleware de 4 parámetros los errores que ocurren **antes** de él. |

### Detalles de CSRF

- El token se envía en el campo oculto `_csrf` de cada formulario, en la cabecera `X-CSRF-Token` (para `fetch`, que lo lee de `<meta name="csrf-token">`) o en la query string `?_csrf=` en los formularios multipart. En esos formularios Multer lee el cuerpo **después** de la verificación CSRF, así que el campo oculto todavía no existe cuando CSRF lo busca.
- El token se firma con `SESSION_SECRET` y el id de sesión. Por eso la sesión se guarda en cuanto se emite un token, y un token de otra sesión no sirve. Tras `session.regenerate()` en el login, el token anterior deja de ser válido y `generarTokenCsrf()` emite uno nuevo en la siguiente página.

### Subida de fotos (`middlewares/upload.js`)

- **Tipos permitidos:** JPG, PNG y WEBP. Se comprueban tres cosas: el tipo MIME, que la extensión le corresponda y la firma real del archivo (sus primeros bytes). El MIME y la extensión los decide el cliente, así que un `.txt` renombrado a `.png` pasaría sin la tercera comprobación.
- **Límites:** `MAX_FOTO_MB` por foto y hasta 5 fotos por envío.
- **Nombres:** los archivos se guardan con un nombre único, fecha + UUID, en `public/uploads/tickets/`.
- **Errores:** si el envío se rechaza, se borran los archivos que alcanzaron a guardarse. Los errores de Multer se convierten en `ValidationError` con mensajes en español.

## Errores

Todos los errores propios heredan de `AppError` (`utils/errors/`), que lleva un `statusCode`:

| Clase | Código | Cuándo se usa |
|---|---|---|
| `ValidationError` | 400 | Datos de formulario inválidos |
| `AuthError` | 401 | No hay sesión o las credenciales son incorrectas |
| `ForbiddenError` | 403 | El usuario no tiene permiso (ej. un técnico sobre un ticket ajeno, RN-02) |
| `NotFoundError` | 404 | El recurso no existe |
| `BusinessRuleError` | 422 | Se viola una regla de negocio (ej. saltar estados, RN-04) |

Los servicios **lanzan** estos errores. `asyncHandler` los atrapa, también los lanzados de forma síncrona, y los pasa con `next(error)` al manejador central (`middlewares/errorHandler.js`).

### Qué hace `errorHandler`

1. **Traduce** el error a un `AppError` con `utils/traducirError.js`:

   | Error de origen | Resultado |
   |---|---|
   | `UniqueConstraintError` | 400 con el mensaje del modelo (ej. «Ya existe un usuario con ese correo.»). El índice de RN-09, que solo existe en la base, da un 422 con el mensaje de la regla. |
   | `ValidationError` de Sequelize | 400 con el mensaje y el campo de la validación del modelo. |
   | `ForeignKeyConstraintError` | 1452 (el padre no existe) → 400 «El cliente indicado no existe.»; 1451 (borrar algo en uso) → 422 «No se puede eliminar el registro porque tiene otros registros asociados.» |
   | `DatabaseError` por CHECK (4025 en MariaDB, 3819 en MySQL) | 400 con el mensaje de esa restricción (ej. «El precio de referencia no puede ser negativo.»). |
   | Token CSRF inválido | 403 «El formulario expiró o no es válido…» |
   | Cuerpo demasiado grande o JSON mal formado | 413 / 400 |
   | Cualquier otro | 500 con un mensaje genérico. |

2. **Responde según quién pidió:**
   - **API o JavaScript** (`Accept: application/json`, `X-Requested-With` o una ruta `/api/…`): JSON `{ error, mensaje }`, más `errores` por campo cuando los hay.
   - **Formulario** (`POST`, `PUT`, `PATCH` o `DELETE`) con `ValidationError` o `BusinessRuleError`: redirige con 303 a la página anterior y deja en flash el mensaje, los errores por campo y los datos ingresados (sin contraseñas ni tokens). Solo redirige a un `Referer` del mismo sitio; si no, a `/`.
   - **`AuthError` desde el navegador:** deja el mensaje en flash y redirige a `/login`.
   - **Lo demás:** renderiza `views/errores/<código>.ejs` con el layout.
3. **Nunca envía el stack** al navegador ni al cliente JSON, en ningún entorno. Los 500 se registran con su stack en consola (también en pruebas, para que un fallo no pase en silencio); los 4xx solo en desarrollo.

## Recorrido de una petición

Ejemplo: un técnico cambia el estado de su ticket (`PATCH /tickets/15/estado`).

1. **`app.js`**: Express recibe la petición; helmet agrega las cabeceras de seguridad y se leen el cuerpo y las cookies. `method-override` convierte el `POST` del formulario en `PATCH`, se carga la sesión desde MySQL y csrf-csrf verifica el token (403 si falta o no es válido).
2. **`routes/`**: `routes/index.js` envía la petición al router de `/tickets`, donde la ruta coincide y ejecuta su cadena de middlewares.
3. **`middlewares/`**: se verifica la sesión (401 si no hay), el rol `tecnico` (403 si no corresponde) y los datos con `validar` + express-validator (400 si son inválidos).
4. **`controllers/`**: el controlador toma el `id`, el nuevo estado y el usuario de la sesión, y llama a `TicketService.cambiarEstado(...)`.
5. **`services/`**: el servicio carga el ticket, comprueba que esté asignado al técnico (RN-02), valida la transición con `MaquinaEstadosTicket` (RN-04) y, si el destino es `En_reparacion`, que exista una cotización aprobada (RN-01). Dentro de una **transacción** actualiza el ticket y registra el cambio en `ticket_historiales`.
6. **`models/`**: Sequelize traduce las operaciones a SQL sobre MySQL.
7. **Respuesta**: el controlador guarda un mensaje flash y redirige al detalle del ticket, que se renderiza con su vista EJS.
8. **Si algo falla** en cualquier paso, el error llega a `errorHandler`. Si es una regla de negocio (ej. RN-04), regresa al detalle del ticket con el mensaje en flash; en otro caso, muestra la vista de error con el código adecuado.
