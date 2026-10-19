# Matriz de trazabilidad

Relaciona cada historia de usuario, requerimiento funcional, regla de negocio y requerimiento no funcional del Documento Maestro con la ruta, el código que lo implementa y la prueba que lo verifica. Estado al cierre del Sprint II.

**Estado:** ✅ completo · 🟡 parcial (se explica qué falta) · ❌ pendiente.

**Abreviaturas de pruebas:** `auth`, `catalogo`, `clientes`, `cotizaciones`, `erroresSequelize`, `middlewares`, `modelos`, `rendimiento`, `reportes`, `servidor`, `tickets`, `upload`, `usuarios` y `validar` = `tests/integration/<nombre>.test.js`; `unit/<nombre>` = `tests/unit/<nombre>.test.js`. El texto después de "›" es el nombre del `describe` o de la prueba.

## Resumen

| Tipo | Total | ✅ | 🟡 | ❌ |
|---|---|---|---|---|
| Historias de usuario (HU-01 a HU-10) | 10 | 10 | 0 | 0 |
| Requerimientos funcionales (RF-01 a RF-12) | 12 | 12 | 0 | 0 |
| Reglas de negocio (RN-01 a RN-09) | 9 | 9 | 0 | 0 |
| Requerimientos no funcionales (RNF-01 a RNF-06) | 6 | 3 | 3 | 0 |

Los tres RNF parciales (RNF-01, RNF-03 y RNF-06) están implementados, pero se verifican solo de forma manual (ver [`PRUEBAS.md`](PRUEBAS.md)): no tienen una prueba automática que mida tiempo de uso, navegadores o tamaño de pantalla.

## 1. Historias de usuario

| Historia | Estado | Requerimiento | Reglas | Ruta | Controlador / Servicio | Prueba que lo verifica |
|---|---|---|---|---|---|---|
| **HU-01** Admin registra clientes y sus equipos | ✅ | RF-01, RF-02, RF-05 | RN-02 (técnico solo lectura) | `GET /clientes` (búsqueda, paginación), `GET /clientes/nuevo`, `POST /clientes`, `GET /clientes/:id`, `GET /clientes/:id/editar`, `PUT`/`DELETE /clientes/:id`; `GET /equipos/nuevo?cliente_id=`, `POST /equipos`, `GET /equipos/:id`, `GET /equipos/:id/editar`, `PUT`/`DELETE /equipos/:id` | `ClientesController`, `EquiposController`; `ClienteService.crear` (cliente + primer equipo en una transacción), `listar`, `actualizar`, `eliminar`; `EquipoService` (`crear`, `actualizar`, `eliminar`, `validarSerieUnica`); `validators/clienteValidators.js` | clientes › Listado; CRUD de clientes (incluida la transacción); Validaciones; Equipos; Permisos; rendimiento; unit/servicios › ClienteService, EquipoService |
| **HU-02** Técnico crea ticket con diagnóstico y fotos | ✅ | RF-03 | RN-02, RN-03 | `GET /tickets/nuevo`, `GET /tickets/equipos?cliente_id=` (JSON), `POST /tickets` (multipart), `GET /fotos/:id` | `TicketsController.crear`; `TicketService.crear` (cliente/equipo existente o nuevo, folio, historial y fotos en UNA transacción; borra las fotos si falla); `FolioService.generar`; `FotoService.obtener`; `middlewares/upload.js`; `public/js/nuevo-ticket.js` | tickets › Crear tickets (folio, Recibido, historial inicial, rollback sin archivos huérfanos, 5 simultáneas); Fotos protegidas; unit/FolioService; upload |
| **HU-03** Técnico genera cotización | ✅ | RF-06 | RN-02, RN-06, RN-09 | `GET /cotizaciones/nueva?ticket_id=`, `POST /cotizaciones`, `GET /cotizaciones/:id/editar`, `PUT /cotizaciones/:id`, `GET /cotizaciones` | `CotizacionesController`; `CotizacionService.crear` (catálogo activo, precio copiado, total en centavos, ticket a Esperando_aprobacion; cotización adicional DT-01), `editar`, `prepararLineas`; `CatalogoService.listarActivos`; `public/js/cotizacion.js` | cotizaciones › Crear cotizaciones; Cotización adicional; unit/cotizaciones › Total en centavos; Líneas del formulario |
| **HU-04** Cliente consulta su ticket con folio | ✅ | RF-05 | RN-05 | `GET /portal`, `POST /portal` (rate limit), `GET /portal/ticket`, `POST /portal/salir` | `PortalController`; `AuthService.verificarAccesoCliente` (mensaje genérico, teléfono normalizado); `PortalService.obtenerResumenTicket` (estado, fecha estimada SC-03, equipo e historial sin notas internas); `requireCliente` | auth › Portal del cliente; tickets › Portal del cliente; Fotos protegidas (cliente); auth › Rate limit; unit/AuthService › normalizarTelefono |
| **HU-05** Cliente aprueba o rechaza una cotización | ✅ | RF-07 | RN-01, RN-06 | `POST /portal/cotizaciones/:id/aprobar`, `POST /portal/cotizaciones/:id/rechazar` | `PortalController.responder`; `CotizacionService.responder` (transacción con bloqueo de fila; solo la cotización del ticket de la sesión; historial con `usuario_id` NULL); `CotizacionService.vigenteDelTicket` | cotizaciones › Respuesta del cliente en el portal (aprobar, rechazar con motivo, dos veces, simultáneas, ticket ajeno); Flujo completo de punta a punta |
| **HU-06** Técnico actualiza el estado del ticket | ✅ | RF-04 | RN-01, RN-02, RN-04 | `GET /tickets`, `GET /tickets/:id`, `PATCH /tickets/:id/estado`, `PATCH /tickets/:id/tecnico` (admin) | `TicketsController`; `MaquinaEstadosTicket`; `TicketService.cambiarEstado` (RN-01, `fecha_entrega`, cancelación con motivo), `reasignar`, `obtenerDetalle`, `listar` | tickets › Flujo de estados; Cancelación; Reasignación; Listado y detalle; unit/MaquinaEstadosTicket |
| **HU-07** Admin gestiona el catálogo | ✅ | RF-08 | RN-02 | `GET /catalogo` (?tipo=, ?q=), `GET /catalogo/nuevo`, `POST /catalogo`, `GET /catalogo/:id/editar`, `PUT /catalogo/:id`, `PATCH /catalogo/:id/activo`, `DELETE /catalogo/:id` | `CatalogoController`; `CatalogoService` (`listar`, `listarActivos`, `crear`, `actualizar`, `cambiarEstado`, `eliminar`, `validarPrecio`); `validators/catalogoValidators.js` | catalogo › Listado; CRUD del catálogo; Permisos; unit/servicios › CatalogoService |
| **HU-08** Admin ve reportes por técnico y tiempos promedio | ✅ | RF-11 | RN-02 (solo admin) | `GET /reportes?desde=&hasta=`, `GET /reportes/tecnicos.csv`; KPIs en `GET /admin` | `ReportesController`; `ReporteService` (`validarRango`, `ticketsPorTecnico`, `serviciosMasSolicitados`, `resumenPorEstado`, `csvTicketsPorTecnico`); `TicketService.resumenAdmin` | reportes › todas; tickets › Dashboards |
| **HU-09** Admin gestiona cuentas de técnicos | ✅ | RF-09, RF-10 | RN-07, RN-08 | `GET /usuarios`, `GET /usuarios/nuevo`, `POST /usuarios`, `GET /usuarios/:id/editar`, `PUT /usuarios/:id`, `PATCH /usuarios/:id/activo`, `GET`/`PUT /usuarios/:id/password`, `DELETE /usuarios/:id`; `GET`/`POST /login`, `POST /logout` | `UsuariosController`, `AuthController`; `UsuarioService` (`crearTecnico`, `cambiarEstado`, `restablecerPassword`, `validarQueQuedeAcceso`…); `AuthService` (`login`, `hashPassword`, `validarFortaleza`, `obtenerUsuarioActivo`) | usuarios › todas; auth › Inicio de sesión; Revalidación de la sesión (RN-07); unit/AuthService; unit/servicios › UsuarioService |
| **HU-10** Técnico recibe notificación cuando el cliente responde | ✅ | RF-12 | RN-06 | `GET /notificaciones`, `GET /notificaciones/no-leidas` (JSON), `PATCH /notificaciones/:id/leida`, `PATCH /notificaciones/leidas`; campana en la barra; alerta en `GET /tecnico` | `NotificacionesController`; `NotificacionService`; `services/eventos/busEventos.js` (`emitirAlConfirmar`), `NotificacionListener`; `public/js/notificaciones.js` | cotizaciones › Notificaciones; un error dentro de la transacción no genera notificaciones; unit/cotizaciones › NotificacionListener |

## 2. Requerimientos funcionales

| Requerimiento | Estado | Ruta | Servicio / tablas | Prueba que lo verifica |
|---|---|---|---|---|
| **RF-01** Registrar clientes | ✅ | `/clientes` | `ClienteService`; `clientes` (teléfono de 8 dígitos guardado `0000-0000`, correo opcional) | clientes › CRUD de clientes; Validaciones; modelos › Registros válidos |
| **RF-02** Registrar equipos de un cliente | ✅ | `/equipos`, `POST /clientes` (primer equipo) | `EquipoService`; `equipos` (FK RESTRICT, `numero_serie` UNIQUE) | clientes › Equipos; la transacción revierte el cliente si el equipo falla; modelos › Índices únicos |
| **RF-03** Crear ticket con diagnóstico y foto | ✅ | `POST /tickets` | `TicketService.crear`, `FolioService`, `FotoService`; `tickets`, `ticket_fotos`, `ticket_historiales`, `folio_contadores` | tickets › Crear tickets; Fotos protegidas; upload |
| **RF-04** Actualizar el estado siguiendo el flujo | ✅ | `PATCH /tickets/:id/estado` | `MaquinaEstadosTicket`, `TicketService.cambiarEstado`; `ticket_historiales` (usuario y comentario, SC-04) | tickets › Flujo de estados; unit/MaquinaEstadosTicket |
| **RF-05** Historial de tickets por cliente o por equipo | ✅ | `GET /clientes/:id`, `GET /equipos/:id`, `GET /portal/ticket` | `TicketService.listarPorCliente`, `listarPorEquipo`; `PortalService` | tickets › el detalle del cliente y del equipo muestran su historial; tickets › Portal del cliente |
| **RF-06** Generar cotización con el catálogo | ✅ | `POST /cotizaciones` | `CotizacionService.crear`, `prepararLineas`; `cotizaciones`, `cotizacion_items` | cotizaciones › Crear cotizaciones; unit/cotizaciones |
| **RF-07** Registrar la aprobación o rechazo del cliente | ✅ | `POST /portal/cotizaciones/:id/aprobar` y `/rechazar` | `CotizacionService.responder`; historial con `usuario_id` NULL | cotizaciones › Respuesta del cliente en el portal |
| **RF-08** Administrar servicios y repuestos | ✅ | `/catalogo` | `CatalogoService`; `catalogo_items` (`activo`, precio > 0) | catalogo › CRUD del catálogo |
| **RF-09** Administrar cuentas de técnicos | ✅ | `/usuarios` | `UsuarioService`; `usuarios` | usuarios › todas |
| **RF-10** Autenticación con control por rol | ✅ | `/login`, `/logout`, todos los routers | `AuthService`; `middlewares/auth.js` (`requireAuth`, `checkRole`, `soloLecturaPara`, `requireCliente`); `sesiones` | auth › Inicio de sesión; Matriz de permisos (RN-02); Cierre de sesión |
| **RF-11** Reporte de tickets por técnico y tiempo promedio | ✅ | `/reportes`, `/reportes/tecnicos.csv` | `ReporteService` (consultas agregadas sobre `ticket_historiales`) | reportes › ReporteService.ticketsPorTecnico; Página /reportes y CSV |
| **RF-12** Notificar dentro del sistema cuando cambia un ticket | ✅ | `/notificaciones` | Bus de eventos + `NotificacionListener` + `NotificacionService`; `notificaciones` (`tipo`, SC-06) | cotizaciones › Notificaciones; tickets › Reasignación; Cancelación; unit/cotizaciones › NotificacionListener |

## 3. Reglas de negocio

| Regla | Estado | Ruta | Dónde se garantiza | Prueba que lo verifica |
|---|---|---|---|---|
| **RN-01** No pasar a En_reparacion sin cotización Aprobada | ✅ | `PATCH /tickets/:id/estado`, `POST /portal/cotizaciones/:id/aprobar` | `MaquinaEstadosTicket.requiereCotizacionAprobada` + `TicketService.cambiarEstado` (cuenta las Aprobadas dentro de la transacción); por el portal, `CotizacionService.responder` aprueba la cotización y mueve el ticket en la misma transacción | tickets › RN-01: no se puede volver a En reparación sin una cotización Aprobada; cotizaciones › Flujo completo (intenta reparar antes de aprobar) |
| **RN-02** El técnico solo ve y edita sus tickets; el admin ve todos | ✅ | todos los routers; `/tickets`, `/cotizaciones`, `/fotos/:id` | `requireAuth`, `checkRole`, `soloLecturaPara`; `TicketService.listar` filtra por `tecnico_id` **en la consulta**; `TicketService.verificarAcceso` (ForbiddenError); `FotoService.obtener` | auth › Matriz de permisos (RN-02); tickets › el técnico solo ve sus tickets; recibe 403 en el de otro; cotizaciones › un técnico no puede cotizar un ticket ajeno |
| **RN-03** Folio único, correlativo, `TT-AAAA-NNNN` | ✅ | `POST /tickets` | `FolioService.generar` (contador por año con `INSERT ... ON DUPLICATE KEY UPDATE` + `SELECT ... FOR UPDATE`, SC-05); índice único y `CHECK` del folio | unit/FolioService (formato, correlativo, reinicio de año); tickets › 5 creaciones simultáneas producen folios distintos y consecutivos; modelos › Índices únicos |
| **RN-04** No se pueden saltar estados | ✅ | `PATCH /tickets/:id/estado` | `MaquinaEstadosTicket` (transiciones y quién las provoca: manual, cotización, cliente, cancelación del admin) | unit/MaquinaEstadosTicket (las 56 combinaciones de estados); tickets › una transición que salta estados se rechaza con 422 |
| **RN-05** Cotización Pendiente > N días = "Pendiente de respuesta"; nunca se cancela sola | ✅ | detalle del ticket, `/tickets`, `/admin`, `/cotizaciones?vencidas=1` | `CotizacionService.estaPendienteDeRespuesta`, `contarPendientesDeRespuesta`; `utils/cotizaciones.js` › `estaVencida`; `DIAS_LIMITE_COTIZACION` | unit/cotizaciones › RN-05 (fechas simuladas); cotizaciones › Detalle del ticket y RN-05 |
| **RN-06** Cotizar → Esperando_aprobacion; aprobar → En_reparacion; rechazar → Cancelado; se notifica al técnico | ✅ | `POST /cotizaciones`, `/portal/cotizaciones/:id/aprobar` y `/rechazar` | `CotizacionService.crear` y `responder` (transacciones); evento `cotizacion.respondida` → `NotificacionListener` | cotizaciones › Crear cotizaciones; Respuesta del cliente; Flujo completo |
| **RN-07** Un técnico desactivado no puede iniciar sesión | ✅ | `POST /login` y toda ruta con `requireAuth` | `AuthService.login`; `requireAuth` revisa `activo` en cada petición y cierra la sesión | auth › el técnico inactivo (Óscar Meléndez) no puede iniciar sesión; Revalidación de la sesión; usuarios › desactivar a un técnico le impide iniciar sesión |
| **RN-08** Contraseñas solo con bcrypt; nunca exponer `password_hash` | ✅ | `/login`, `/usuarios` | `Usuario.defaultScope` y `toJSON()`; `AuthService.hashPassword` y `validarFortaleza`; la sesión guarda solo `{ id, nombre, rol }` | modelos › RN-08; auth › ni las respuestas del login ni la sesión contienen password_hash; usuarios › contraseña cifrada con bcrypt; listado sin password_hash |
| **RN-09** Solo una cotización Pendiente por ticket | ✅ | `POST /cotizaciones` | `CotizacionService.crear` lo revisa primero; columna generada `pendiente_ticket_id` + índice único `uq_cotizaciones_una_pendiente` como respaldo (traducido a 422 por `utils/traducirError.js`) | cotizaciones › no se puede crear otra si ya hay una Pendiente; modelos › Restricciones de BD (RN-09); erroresSequelize › unique solo de la base (RN-09) |

Reglas adicionales de los módulos de administración (no tienen código RN en el Documento Maestro):

| Regla | Dónde | Prueba |
|---|---|---|
| No se elimina un cliente con equipos ni un equipo con tickets | `ClienteService.eliminar`, `EquipoService.eliminar` (BusinessRuleError 422) | clientes › no elimina un cliente con equipos; no elimina un equipo con tickets |
| Un ítem del catálogo ya usado solo se desactiva; solo los activos se cotizan | `CatalogoService.eliminar`, `listarActivos` | catalogo › un ítem usado en cotizaciones no se elimina; listarActivos; cotizaciones › un ítem desactivado se rechaza |
| Un admin no se desactiva a sí mismo y siempre queda un admin activo | `UsuarioService.validarQueQuedeAcceso` | usuarios › un admin no puede desactivarse a sí mismo; último admin activo |
| El total de una cotización lo calcula el servidor | `CotizacionService.prepararLineas` (centavos) | cotizaciones › total manipulado se ignora; unit/cotizaciones › 3 x 0.10 |

## 4. Requerimientos no funcionales

| Requerimiento | Estado | Cómo se cumple | Dónde | Verificación |
|---|---|---|---|---|
| **RNF-01** Usabilidad: crear un ticket en menos de 2 minutos | 🟡 | Solo 4 datos obligatorios (cliente, equipo, diagnóstico, una foto); buscador que filtra clientes mientras se escribe y lo selecciona si queda uno; los equipos del cliente se cargan solos (y se elige si tiene uno); cliente y equipo nuevos en el mismo formulario; vista previa de fotos | `views/tickets/form.ejs`, `public/js/nuevo-ticket.js`, `GET /tickets/equipos` | Manual: PRUEBAS.md › M-09 (cronometrado). **Parcial:** no hay prueba automática de tiempo de uso; las pruebas automáticas cubren el formulario y la creación (tickets › Crear tickets) |
| **RNF-02** Seguridad: contraseñas cifradas y control de acceso por rol | ✅ | bcrypt (RN-08), sesión en MySQL con cookie `httpOnly`/`sameSite`, `session.regenerate()`, CSRF, helmet, rate limit, matriz de permisos y revalidación de la sesión | `services/AuthService.js`, `middlewares/auth.js`, `middlewares/csrf.js`, `config/sesion.js` ([`SEGURIDAD.md`](SEGURIDAD.md)) | auth (52 pruebas); usuarios; middlewares › Protección CSRF; Sesión |
| **RNF-03** Disponibilidad: accesible desde navegadores modernos | 🟡 | HTML5 y CSS estándar renderizados en el servidor; el JavaScript del navegador es mínimo y opcional (los formularios funcionan sin él) | `views/`, `public/` | Manual: PRUEBAS.md › M-01. **Parcial:** sin pruebas automáticas en varios navegadores; la verificación es la prueba manual M-01 |
| **RNF-04** Rendimiento: listados en menos de 3 s con hasta 500 registros | ✅ | Paginación en la consulta (`LIMIT`/`OFFSET`, 10 por página) en todos los listados; conteos con subconsultas; reportes con consultas agregadas | `utils/paginacion.js`, servicios `listar`, `ReporteService` | rendimiento › 500 clientes: responde en menos de 3 segundos y muestra solo 10; la paginación se hace en la consulta |
| **RNF-05** Mantenibilidad: código organizado por capas / MVC | ✅ | `routes → middlewares → controllers → services → models`; lógica de negocio en clases de `services/`; controladores sin consultas a modelos; errores propios; ESLint sin errores | estructura del proyecto ([`ARQUITECTURA.md`](ARQUITECTURA.md)), `eslint.config.js` | `npm run lint`; revisión final (INCIDENCIAS › 42); 533 pruebas automáticas |
| **RNF-06** Compatibilidad: diseño responsive, usable desde tablet | 🟡 | CSS del prototipo de la Fase 1 con punto de quiebre en 768 px (formularios en una columna, tablas con desplazamiento horizontal, barra que se reacomoda) | `public/css/styles.css` (sección 18 y siguientes) | Manual: PRUEBAS.md › M-02 (vista de tablet en las herramientas del navegador). **Parcial:** sin pruebas automáticas de diseño |

## 5. Infraestructura (sin historia asociada)

| Elemento | Archivo | Prueba que lo verifica |
|---|---|---|
| Cabeceras de seguridad (helmet) y orden de los middlewares | `app.js` ([`ARQUITECTURA.md`](ARQUITECTURA.md)) | servidor; middlewares › Otros middlewares |
| Sesión en MySQL (httpOnly, sameSite=lax, secure en producción, 8 h) | `config/sesion.js`, migración `…0011-crear-sesiones` | middlewares › Sesión |
| Protección CSRF (csrf-csrf) en todo POST/PUT/PATCH/DELETE | `middlewares/csrf.js` | middlewares › Protección CSRF |
| Validación de formularios y errores por campo | `middlewares/validar.js`, `validators/`, `views/partials/errorCampo.ejs` | validar; clientes › al fallar, vuelve al formulario |
| Subida de fotos (JPG/PNG/WEBP, firma real, tamaño, máximo 5) | `middlewares/upload.js` | upload; tickets › rechaza un archivo que no es foto |
| Manejo central de errores (HTML/JSON, flash, sin stack) y traducción de errores de Sequelize | `middlewares/errorHandler.js`, `utils/traducirError.js` | middlewares; validar; erroresSequelize; unit/traducirError |
| Bus de eventos después del commit | `services/eventos/busEventos.js` | unit/cotizaciones › el bus emite al hacer commit, no antes; cotizaciones › un error dentro de la transacción no genera notificaciones |
| Rate limit del login y del portal | `middlewares/limitarIntentos.js` | auth › Rate limit |
| Esquema, datos de ejemplo y script SQL | `migrations/` (15), `seeders/` (6), `database/tecnitrack.sql` | `tests/setup/globalSetup.js` migra antes de cada ejecución |
