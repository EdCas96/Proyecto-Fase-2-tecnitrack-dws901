# Matriz de trazabilidad

Relaciona cada historia de usuario con su requerimiento, las reglas de negocio que aplica, la ruta, el código que la implementa y la prueba que la verifica. Se actualiza en cada paso.

Abreviatura de pruebas: `auth`, `clientes`, `catalogo`, `usuarios`, `rendimiento`, `modelos`, `servidor`, `middlewares`, `upload`, `validar` y `erroresSequelize` = `tests/integration/<nombre>.test.js`; `unit/<nombre>` = `tests/unit/<nombre>.test.js`.

En la columna **Ruta**, *(provisional)* indica que el prefijo ya está montado en `routes/index.js` y responde una página "en construcción"; las rutas definitivas se agregan al implementar cada historia.

## 1. Historias de usuario

| Historia de usuario | Requerimiento | Regla | Ruta | Controlador/Servicio | Prueba que lo verifica |
|---|---|---|---|---|---|
| HU-01 Admin registra clientes y equipos | RF-01, RF-02, RNF-04 | RN-02 (técnico solo lectura) | `GET /clientes` (búsqueda, paginación), `GET/POST /clientes/nuevo`→`/clientes`, `GET /clientes/:id`, `GET /clientes/:id/editar`, `PUT`/`DELETE /clientes/:id`; `GET /equipos/nuevo?cliente_id=`, `POST /equipos`, `GET /equipos/:id/editar`, `PUT`/`DELETE /equipos/:id` | `ClientesController`, `EquiposController`; `ClienteService` (`listar`, `obtenerPorId`, `crear` en transacción con el primer equipo, `actualizar`, `eliminar`), `EquipoService` (`crear`, `actualizar`, `eliminar`, `validarSerieUnica`); `validators/clienteValidators.js` | clientes › Listado; CRUD de clientes; Validaciones; Equipos; Permisos; rendimiento; unit/servicios › ClienteService, EquipoService |
| HU-02 Técnico crea ticket con diagnóstico y fotos | RF-03 | RN-03 | `/tickets` (provisional) | *pendiente* (`FolioService`, `TicketService`) | modelos › Índices únicos (folio duplicado); Validaciones (formato de folio); upload › archivos aceptados y rechazados (`middlewares/upload.js`) |
| HU-03 Técnico genera cotización | RF-06 | RN-06, RN-09 | `/cotizaciones` (provisional) | *pendiente* (`CotizacionService`) | modelos › Restricciones de BD (RN-09) |
| HU-04 Cliente consulta su ticket con folio + teléfono | RF-05 | RN-05 (al mostrar la cotización, pendiente) | `GET /portal`, `POST /portal` (rate limit), `GET /portal/ticket` (`requireCliente`), `POST /portal/salir` | `PortalController`; `AuthService.verificarAccesoCliente`, `AuthService.normalizarTelefono`; `PortalService.obtenerResumenTicket`; `middlewares/auth.js` › `requireCliente` | auth › Portal del cliente (HU-04); auth › Rate limit (portal); unit/AuthService › normalizarTelefono |
| HU-05 Cliente aprueba/rechaza cotización | RF-07 | RN-01, RN-06 | `/portal` (provisional) | *pendiente* (`CotizacionService`) | — |
| HU-06 Técnico actualiza estado sin saltar el flujo | RF-04 | RN-01, RN-02, RN-04 | `/tickets` (provisional) | *pendiente* (`MaquinaEstadosTicket`, `TicketService`) | modelos › Restricciones de BD (ENUM de estado) |
| HU-07 Admin gestiona catálogo | RF-08 | RN-02 (técnico solo lectura) | `GET /catalogo` (?tipo=, ?q=, paginación), `GET /catalogo/nuevo`, `POST /catalogo`, `GET /catalogo/:id/editar`, `PUT /catalogo/:id`, `PATCH /catalogo/:id/activo`, `DELETE /catalogo/:id` | `CatalogoController`; `CatalogoService` (`listar`, `listarActivos` para el paso 7, `crear`, `actualizar`, `cambiarEstado`, `eliminar`, `validarPrecio`); `validators/catalogoValidators.js` | catalogo › Listado; CRUD del catálogo; Permisos; unit/servicios › CatalogoService; modelos › Integridad referencial (ítem usado) |
| HU-08 Admin ve reporte por técnico y tiempo promedio | RF-11 | — | `/reportes` (provisional) | *pendiente* (`ReporteService`) | — |
| HU-09 Admin gestiona técnicos | RF-09, RF-10 | RN-07, RN-08 | `GET/POST /login`, `POST /logout`; `GET /usuarios`, `GET /usuarios/nuevo`, `POST /usuarios`, `GET /usuarios/:id/editar`, `PUT /usuarios/:id`, `PATCH /usuarios/:id/activo`, `GET`/`PUT /usuarios/:id/password`, `DELETE /usuarios/:id` | `AuthController`, `UsuariosController`; `AuthService.login`, `hashPassword`, `validarFortaleza`, `obtenerUsuarioActivo`; `UsuarioService` (`listar`, `crearTecnico`, `actualizar`, `cambiarEstado`, `restablecerPassword`, `eliminar`, `validarQueQuedeAcceso`); `validators/usuarioValidators.js`; `middlewares/auth.js` › `requireAuth` | auth › Inicio de sesión; Cierre de sesión; Revalidación de la sesión (RN-07); usuarios › todas; unit/AuthService › validarFortaleza; unit/servicios › UsuarioService; modelos › RN-08 |
| HU-10 Técnico recibe notificación cuando el cliente responde | RF-12 | RN-06 | `/notificaciones` (provisional) | *pendiente* (modelo `Notificacion` listo) | modelos › Registros válidos (notificación no leída) |

## 2. Requerimientos funcionales ↔ tablas

Qué tablas, columnas y restricciones dan soporte a cada requerimiento del Documento Maestro.

| Requerimiento | Tablas | Columnas / restricciones clave | Modelo(s) | Migración | Prueba que lo verifica |
|---|---|---|---|---|---|
| **RF-01** Registrar clientes | `clientes` | `nombre`, `telefono` (NOT NULL, índice), `correo` (opcional, formato) | `Cliente` (`ClienteService`) | `…0002-crear-clientes` | clientes › CRUD de clientes; Validaciones (teléfono de 8 dígitos, correo); modelos › Registros válidos |
| **RF-02** Registrar equipos de un cliente | `equipos` | FK `cliente_id` → `clientes` (RESTRICT), `tipo` ENUM, `numero_serie` UNIQUE | `Equipo` (`EquipoService`) | `…0003-crear-equipos` | clientes › Equipos (serie duplicada, equipo con tickets); CRUD de clientes (no elimina cliente con equipos; transacción); modelos › Índices únicos |
| **RF-03** Crear ticket con diagnóstico y foto | `tickets`, `ticket_fotos`, `ticket_historiales` | `folio` UNIQUE + CHECK formato, `estado` DEFAULT 'Recibido', `diagnostico_inicial` NOT NULL; `ticket_fotos` CASCADE | `Ticket`, `TicketFoto` | `…0005`, `…0006` | modelos › Registros válidos; Índices únicos (folio); Restricciones de BD (CHECK folio, NOT NULL, valores por defecto); CASCADE fotos |
| **RF-04** Actualizar estado siguiendo el flujo | `tickets`, `ticket_historiales` | `estado` ENUM de 8 valores; cada cambio = 1 fila en historial | `Ticket`, `TicketHistorial` | `…0005`, `…0007` | modelos › Validaciones (enum de estado); Restricciones de BD (ENUM) |
| **RF-05** Historial de tickets por cliente o equipo | `clientes` → `equipos` → `tickets` → `ticket_historiales` | FK en cadena; índice `(ticket_id, fecha)` | `Cliente.equipos`, `Equipo.tickets`, `Ticket.historial` | `…0002` a `…0007` | modelos › Asociaciones (cliente → equipos → tickets) |
| **RF-06** Generar cotización desde el catálogo | `cotizaciones`, `cotizacion_items`, `catalogo_items` | `total` y `precio_unitario` CHECK ≥ 0, `cantidad` CHECK ≥ 1, ítems CASCADE, catálogo RESTRICT, una sola Pendiente por ticket (RN-09) | `Cotizacion`, `CotizacionItem` | `…0008`, `…0009` | modelos › Validaciones (precio, cantidad, total); Restricciones de BD (CHECK, RN-09); CASCADE ítems |
| **RF-07** Registrar aprobación/rechazo del cliente | `cotizaciones`, `tickets`, `ticket_historiales` | `cotizaciones.estado` ENUM; historial con `usuario_id` NULL (acción del cliente) | `Cotizacion`, `TicketHistorial` | `…0007`, `…0008` | — (se probará con `CotizacionService`) |
| **RF-08** Administrar servicios y repuestos | `catalogo_items` | `nombre` UNIQUE, `tipo` ENUM, `precio_referencia` CHECK ≥ 0, `activo` (se desactiva, no se borra) | `CatalogoItem` (`CatalogoService`) | `…0004-crear-catalogo-items` | catalogo › CRUD del catálogo (precio > 0 con 2 decimales, nombre único, ítem usado solo se desactiva); modelos › Restricciones de BD (CHECK) |
| **RF-09** Administrar cuentas de técnicos | `usuarios` | `correo` UNIQUE, `rol` ENUM, `activo` (RN-07) | `Usuario` (`UsuarioService`) | `…0001-crear-usuarios` | usuarios › Crear técnicos; Editar, activar y desactivar; Restablecer contraseña; modelos › Índices únicos (correo) |
| **RF-10** Autenticación con control por rol | `usuarios`, `sesiones` | `password_hash` (solo bcrypt, RN-08), `rol`, `activo`; `defaultScope` sin hash, scope `conPassword`; la sesión guarda solo `{ id, nombre, rol }` | `Usuario` | `…0001-crear-usuarios`, `…0011-crear-sesiones` | auth › Inicio de sesión; Matriz de permisos (RN-02); modelos › RN-08: password_hash nunca aparece |
| **RF-11** Reporte por técnico y tiempo promedio | `tickets`, `ticket_historiales`, `usuarios` | `tickets.tecnico_id`, `fecha_ingreso`, `fecha_entrega`; índice `(estado_nuevo, fecha)` | `Ticket`, `TicketHistorial` | `…0005`, `…0007` | — (se probará con `ReporteService`) |
| **RF-12** Notificar cambios de estado | `notificaciones` | FK `ticket_id`, `usuario_id`; `leida` DEFAULT false; índice `(usuario_id, leida)` | `Notificacion` | `…0010-crear-notificaciones` | modelos › Registros válidos; Asociaciones (notificaciones del técnico) |

## 3. Reglas de negocio implementadas en la capa de datos

| Regla | Dónde se garantiza | Prueba |
|---|---|---|
| RN-03 Folio único TT-AAAA-NNNN | Índice único `uq_tickets_folio`, `CHECK chk_tickets_folio`, validación `is` del modelo | modelos › Índices únicos; Validaciones; Restricciones de BD |
| RN-08 Nunca exponer password_hash | `Usuario.defaultScope`, `Usuario.toJSON()`; `AuthService.login` devuelve el usuario sin hash y el login guarda en sesión solo `{ id, nombre, rol }`; `variablesVistas.js` publica solo esos campos; `errorHandler.js` y el formulario de login nunca devuelven la contraseña; `AuthService.validarFortaleza` (mín. 8 caracteres, letra y número) | modelos › RN-08; auth › ni las respuestas del login ni la sesión contienen password_hash; validar › regresa sin contraseñas ni tokens; unit/AuthService |
| RN-09 Una sola cotización Pendiente | Columna generada `pendiente_ticket_id` + índice único `uq_cotizaciones_una_pendiente` | modelos › Restricciones de BD (RN-09) |
| RN-09 (mensaje al usuario) | `utils/traducirError.js` convierte la violación del índice en un `BusinessRuleError` 422 con el texto de la regla | erroresSequelize › unique solo de la base (RN-09) |

## 3.1 Reglas de negocio implementadas en servicios y middlewares

| Regla | Ruta | Dónde se garantiza | Prueba |
|---|---|---|---|
| RN-02 Cada rol ve solo lo suyo (matriz de permisos) | todos los routers protegidos | `middlewares/auth.js` › `requireAuth`, `checkRole`, `soloLecturaPara`; cada `routes/*.js` declara su acceso. El filtro "el técnico solo ve sus tickets" se agrega con `TicketService`. | auth › Matriz de permisos (RN-02) |
| RN-08 al crear o restablecer contraseñas | `POST /usuarios`, `PUT /usuarios/:id/password` | `UsuarioService.crearTecnico` y `restablecerPassword` usan `AuthService.hashPassword` (valida fortaleza y cifra con bcrypt); `UsuarioService` selecciona solo columnas públicas | usuarios › crea un técnico… cifrada con bcrypt; rechaza la contraseña débil; listado sin password_hash |
| RN-07 Técnico desactivado no entra | `POST /login` y toda ruta con `requireAuth` | `AuthService.login` (rechaza la cuenta inactiva); `requireAuth` + `AuthService.obtenerUsuarioActivo` revisan `activo` en cada petición y cierran la sesión | auth › el técnico inactivo (Óscar Meléndez) no puede iniciar sesión; Revalidación de la sesión (RN-07) |

Reglas de los módulos de administración (no tienen código RN en el Documento Maestro):

| Regla | Dónde | Prueba |
|---|---|---|
| No se elimina un cliente con equipos | `ClienteService.eliminar` (BusinessRuleError 422) | clientes › no elimina un cliente con equipos |
| No se elimina un equipo con tickets | `EquipoService.eliminar` | clientes › no elimina un equipo con tickets |
| Número de serie único | `EquipoService.validarSerieUnica` + índice `uq_equipos_numero_serie` | clientes › rechaza un número de serie duplicado; transacción |
| Ítem usado en cotizaciones: solo se desactiva | `CatalogoService.eliminar` / `cambiarEstado` | catalogo › un ítem usado… no se elimina; desactiva y vuelve a activar |
| Solo ítems activos se cotizan | `CatalogoService.listarActivos` | catalogo › listarActivos excluye los desactivados |
| Un admin no se desactiva ni elimina a sí mismo; siempre queda un admin activo | `UsuarioService.validarQueQuedeAcceso` | usuarios › un admin no puede desactivarse a sí mismo; último admin activo; unit/servicios › UsuarioService |
| RNF-04 Listados paginados en la consulta (10 por página) | `utils/paginacion.js` (`findAndCountAll` con `limit`/`offset`) | rendimiento › 500 clientes en menos de 3 s; LIMIT/OFFSET |

Las reglas RN-01, RN-04, RN-05 y RN-06 se implementarán en `services/`.

## 4. Infraestructura (sin historia asociada)

| Elemento | Ruta | Archivo | Prueba que lo verifica |
|---|---|---|---|
| Página de inicio (badges de estado, accesos al login y al portal) | `GET /` | `controllers/inicioController.js`, `views/inicio.ejs` | servidor; middlewares › el badge usa los colores semánticos |
| Cabeceras de seguridad (helmet) | todas | `app.js` | servidor |
| Orden de middlewares (logger, helmet, parsers con límite, cookies, method-override, sesión, flash, CSRF, variables de vistas) | todas | `app.js` (ver ARQUITECTURA.md) | middlewares › Otros middlewares; Sesión |
| Sesión en MySQL (httpOnly, sameSite=lax, secure en producción, 8 h) | todas | `config/sesion.js`, migración `…0011-crear-sesiones` | middlewares › Sesión |
| Protección CSRF (csrf-csrf) | todo POST/PUT/PATCH/DELETE | `middlewares/csrf.js` | middlewares › Protección CSRF |
| Variables comunes de vistas (usuario sin datos sensibles, flash, token CSRF) | todas | `middlewares/variablesVistas.js` | middlewares › Ruteo modular y vistas base; validar |
| Ruteo modular (12 routers con prefijo) | `/` (login/logout), `/portal`, `/admin`, `/tecnico`, `/clientes`, `/equipos`, `/tickets`, `/cotizaciones`, `/catalogo`, `/usuarios`, `/reportes`, `/notificaciones` | `routes/index.js` y `routes/*.js` | middlewares › el router de … está montado; auth › el admin puede entrar a todos los módulos |
| Layout y parciales (navbar por rol, migas, flash, badge de estado) | todas | `views/layouts/main.ejs`, `views/partials/`, `utils/vistas.js` | middlewares › Ruteo modular y vistas base |
| Validación de formularios | rutas con `validar(...)` | `middlewares/validar.js` | validar |
| Subida de fotos (JPG/PNG/WEBP, firma, MAX_FOTO_MB, máx. 5) | rutas con `subirFotos` | `middlewares/upload.js` | upload |
| 404 | cualquier ruta inexistente | `middlewares/notFound.js` | servidor; middlewares › Rutas inexistentes |
| Manejo central de errores (HTML/JSON, flash, sin stack) | todas | `middlewares/errorHandler.js` | middlewares; validar › BusinessRuleError; erroresSequelize |
| Traducción de errores de Sequelize, CSRF y body-parser al español | todas | `utils/traducirError.js` | erroresSequelize; unit/traducirError |
| Clases de error y asyncHandler | — | `utils/errors/`, `utils/asyncHandler.js` | unit/errores; unit/asyncHandler |
| Rate limit del login y del portal (5 intentos fallidos / 15 min, configurable) | `POST /login`, `POST /portal` | `middlewares/limitarIntentos.js`, vista `errores/429` | auth › Rate limit |
| Páginas autenticadas sin caché (botón "atrás" tras cerrar sesión) | rutas con `requireAuth` o `requireCliente` | `middlewares/auth.js` › `sinCache` | auth › las páginas autenticadas no se guardan en caché |
| Paneles de inicio por rol | `GET /admin`, `GET /tecnico` | `DashboardController`, `views/admin/dashboard.ejs`, `views/tecnico/dashboard.ejs` | auth › el admin / el técnico entra y ve su nombre |
| Paginación, errores por campo y confirmación antes de eliminar o desactivar | listados y formularios | `views/partials/paginacion.ejs`, `errorCampo.ejs`, `botonAccion.ejs`, `public/js/confirmar.js`, `utils/vistas.js` (`valorCampo`, `urlPagina`, `migasDe`) | clientes › al fallar, vuelve al formulario…; rendimiento › la búsqueda conserva el filtro |
| Registro de peticiones | todas (fuera de pruebas) | `middlewares/logger.js` | unit/logger |
| Conexión a MySQL (modo estricto) | — | `config/database.js`, `config/config.js` | servidor; modelos › Restricciones de BD (ENUM) |
| Esquema y datos de ejemplo | — | `migrations/`, `seeders/`, `database/tecnitrack.sql` | `tests/setup/globalSetup.js` (migra antes de cada ejecución) |