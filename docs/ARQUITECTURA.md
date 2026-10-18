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
| `app.js` | Configura Express (vistas, helmet, estáticos, parsers, rutas, manejo de errores) y exporta `app` para que las pruebas lo usen sin abrir un puerto. |
| `config/` | `env.js` carga `.env` o `.env.test`; `config.js` es la configuración que lee sequelize-cli; `database.js` crea la instancia única de Sequelize. |
| `routes/` | Asocian cada URL y método HTTP con sus middlewares y su controlador. Envuelven los controladores con `asyncHandler`. |
| `middlewares/` | Lógica transversal antes del controlador: autenticación, autorización por rol, CSRF, validación, carga de archivos, rate limit, 404 y manejo central de errores. |
| `controllers/` | Leen la petición (`req.params`, `req.body`, `req.session`), llaman al servicio y responden (render o redirección). **No** contienen reglas de negocio ni consultas a modelos. |
| `services/` | Lógica de negocio como **clases** (`TicketService`, `CotizacionService`, `FolioService`, `AuthService`, `MaquinaEstadosTicket`…). Aplican las reglas RN-xx, abren transacciones y lanzan errores propios. |
| `models/` | Modelos de Sequelize: columnas, validaciones de datos y asociaciones entre tablas. |
| `migrations/` | Cambios versionados del esquema de la base de datos (crear tablas, índices, llaves foráneas). |
| `seeders/` | Datos iniciales y de ejemplo (usuarios de prueba, catálogo, etc.). |
| `views/` | Plantillas EJS: `layouts/` (estructura común), `partials/` (fragmentos reutilizables) y una carpeta por área: `admin/`, `tecnico/`, `cliente/`, `auth/`, `errores/`. |
| `public/` | Archivos estáticos servidos tal cual: `css/`, `js/` y `uploads/` (fotos subidas, no versionadas). |
| `utils/` | Utilidades sin estado: `asyncHandler.js` y las clases de error en `utils/errors/`. |
| `tests/` | `unit/` prueba clases y servicios aislados; `integration/` prueba rutas completas con Supertest contra `tecnitrack_test`. |
| `database/` | Script SQL del esquema completo (entregable de referencia, generado a partir de las migraciones). |
| `docs/` | Documentación del proyecto. |

## Errores

Todos los errores propios heredan de `AppError` (`utils/errors/`), que lleva un `statusCode`:

| Clase | Código | Cuándo se usa |
|---|---|---|
| `ValidationError` | 400 | Datos de formulario inválidos |
| `AuthError` | 401 | No hay sesión o las credenciales son incorrectas |
| `ForbiddenError` | 403 | El usuario no tiene permiso (ej. un técnico sobre un ticket ajeno, RN-02) |
| `NotFoundError` | 404 | El recurso no existe |
| `BusinessRuleError` | 422 | Se viola una regla de negocio (ej. saltar estados, RN-04) |

Los servicios **lanzan** estos errores; `asyncHandler` los atrapa y los pasa con `next(error)` al middleware central (`middlewares/errores.js`), que elige la vista y el código HTTP. Un error que no sea `AppError` se registra en consola y se responde con un 500 genérico, sin exponer detalles internos.

## Recorrido de una petición

Ejemplo: un técnico cambia el estado de su ticket (`PATCH /tecnico/tickets/15/estado`).

1. **`app.js`**: Express recibe la petición; helmet agrega las cabeceras de seguridad y se leen el cuerpo y las cookies. `method-override` convierte el `POST` del formulario en `PATCH`.
2. **`routes/`**: la ruta coincide y ejecuta su cadena de middlewares.
3. **`middlewares/`**: se verifica la sesión (401 si no hay), el rol `tecnico` (403 si no corresponde), el token CSRF y los datos con express-validator (400 si son inválidos).
4. **`controllers/`**: el controlador toma el `id`, el nuevo estado y el usuario de la sesión, y llama a `TicketService.cambiarEstado(...)`.
5. **`services/`**: el servicio carga el ticket, comprueba que esté asignado al técnico (RN-02), valida la transición con `MaquinaEstadosTicket` (RN-04) y, si el destino es `En_reparacion`, que exista una cotización aprobada (RN-01). Dentro de una **transacción** actualiza el ticket y registra el cambio en `ticket_historiales`.
6. **`models/`**: Sequelize traduce las operaciones a SQL sobre MySQL.
7. **Respuesta**: el controlador guarda un mensaje flash y redirige al detalle del ticket, que se renderiza con su vista EJS.
8. **Si algo falla** en cualquier paso, el error llega al middleware central, que muestra la vista de error con el código adecuado.
