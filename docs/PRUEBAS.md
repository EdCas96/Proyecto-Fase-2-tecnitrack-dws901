# Pruebas

Estrategia de pruebas de TecniTrack (Fase 2), cantidad de pruebas por módulo, resultado de la cobertura y la lista de pruebas manuales para verificar la aplicación en el navegador.

**Resultado al cierre del Sprint II:** 533 pruebas automáticas en 23 archivos, **todas pasan**; cobertura de **94.09 % de sentencias** y **96.35 % de líneas**; `npm run lint` sin errores.

## 1. Estrategia

| Tipo | Herramienta | Qué prueba | Base de datos |
|---|---|---|---|
| **Unitarias** (`tests/unit/`) | Jest | Lógica sin servidor HTTP: máquina de estados, cálculos (folio, total en centavos, RN-05), validación de contraseñas, errores, `asyncHandler`, servicios con los modelos simulados (`jest.spyOn`) | Ninguna (o simulada) |
| **Integración** (`tests/integration/`) | Jest + **Supertest** | La aplicación completa (`app.js`) como la usa un navegador: rutas, middlewares, sesión, CSRF, permisos, servicios, transacciones y la base real | `tecnitrack_test` |

**Base de pruebas separada.** Las pruebas usan `tecnitrack_test`, configurada en `.env.test`, nunca la base de desarrollo:

- `tests/setup/globalSetup.js` se ejecuta una vez antes de todo: se niega a continuar si `DB_NAME` no termina en `_test`, crea la base si no existe y reconstruye el esquema con las **mismas migraciones** de la aplicación (`db:migrate:undo:all` + `db:migrate`).
- Cada archivo de integración vacía las tablas y carga los **seeders** reales (`sembrarDatos()` en `tests/helpers/baseDatos.js`), así que prueba con los mismos datos que ve el usuario en la demo.
- Las fotos van a `storage/fotos-tickets-test/`, que las pruebas crean y borran.
- `npm test` ejecuta los archivos en serie (`--runInBand`) para que no compitan por la misma base.

**Ayudantes** (`tests/helpers/`):

- `agente.js`: agentes de Supertest que conservan cookies como un navegador, leen el token CSRF de la página, inician sesión (`crearAgenteAutenticado`), entran al portal (`entrarAlPortal`) y envían formularios con `_method` (`enviarFormulario`).
- `appPrueba.js`: una mini aplicación para probar un middleware aislado.
- `baseDatos.js`: limpiar, sembrar y cerrar conexiones.
- `fabricas.js`: registros válidos para las pruebas de modelos.

**Qué se busca en cada módulo:** el caso exitoso **y su efecto en la base de datos**, las validaciones rechazadas, cada regla de negocio, los permisos por rol (403/redirección), los errores de concurrencia (folios simultáneos, doble respuesta del cliente) y que una transacción revertida no deje datos, archivos ni notificaciones.

## 2. Pruebas por módulo

| Módulo | Archivo | Pruebas | Qué cubre |
|---|---|---|---|
| Autenticación, permisos y portal | `integration/auth.test.js` | 52 | Login y mensaje genérico, inactivo, `session.regenerate`, logout, sin caché, revalidación de la sesión, matriz de permisos, portal folio + teléfono, rate limit |
| | `unit/AuthService.test.js` | 17 | Fortaleza de contraseña, hash, normalización del teléfono |
| Clientes y equipos | `integration/clientes.test.js` | 39 | Listado y búsqueda, CRUD, transacción cliente + equipo, validaciones, reglas de eliminación, permisos del técnico |
| Catálogo | `integration/catalogo.test.js` | 24 | Filtro por tipo, precio > 0 con 2 decimales, nombre único, ítem usado solo se desactiva, `listarActivos`, permisos |
| Usuarios | `integration/usuarios.test.js` | 20 | Crear técnico con bcrypt, contraseña débil, correo duplicado, activar/desactivar, restablecer, último admin, permisos |
| Servicios (unidad) | `unit/servicios.test.js` | 34 | Métodos principales de ClienteService, EquipoService, CatalogoService y UsuarioService con modelos simulados |
| Tickets y flujo de estados | `integration/tickets.test.js` | 43 | Crear con fotos, rollback sin archivos huérfanos, 5 creaciones simultáneas, RN-02, transiciones, RN-01, entrega, cancelación, reasignación, fotos protegidas, portal, dashboards |
| | `unit/MaquinaEstadosTicket.test.js` | 95 | Las 56 combinaciones de estados para cada origen (manual, cotización, cliente, cancelación) |
| | `unit/FolioService.test.js` | 12 | Formato, correlativo, respaldo, bloqueo `FOR UPDATE`, reinicio de año, zona horaria |
| Cotizaciones, portal y notificaciones | `integration/cotizaciones.test.js` | 27 | Crear y editar, total manipulado, ítem inactivo, RN-09, respuesta del cliente (aprobar, rechazar, dos veces, simultáneas, ticket ajeno), cotización adicional, eventos después del commit, notificaciones y **flujo completo de punta a punta** |
| | `unit/cotizaciones.test.js` | 28 | Total en centavos (3 × 0.10), RN-05 con fechas simuladas, lectura de líneas, NotificacionListener, bus de eventos |
| Reportes | `integration/reportes.test.js` | 26 | Promedio con fechas conocidas, ticket no entregado, rango, rango inválido, servicios, resumen por estado, CSV, 403 |
| Rendimiento (RNF-04) | `integration/rendimiento.test.js` | 4 | 500 clientes en menos de 3 s, LIMIT/OFFSET en la consulta |
| Servidor, middlewares y errores | `integration/servidor.test.js` | 5 | Arranque, conexión a MySQL, helmet, 404 |
| | `integration/middlewares.test.js` | 28 | 404 HTML/JSON, CSRF, cookie de sesión, method-override, límite de tamaño, routers montados |
| | `integration/validar.test.js` | 7 | Regreso al formulario con flash, Referer externo, 422 y 500 |
| | `integration/upload.test.js` | 9 | Tipos permitidos, firma real, tamaño, máximo de fotos, limpieza de archivos |
| | `integration/erroresSequelize.test.js` | 7 | Traducción de unique, llave foránea, CHECK y validaciones de Sequelize |
| | `unit/errores.test.js`, `unit/asyncHandler.test.js`, `unit/logger.test.js`, `unit/traducirError.test.js` | 18 | Clases de error, `asyncHandler`, logger, traducción de errores |
| Modelos | `integration/modelos.test.js` | 38 | Validaciones, índices únicos, restricciones de la base (ENUM, CHECK, RN-09), asociaciones, CASCADE/RESTRICT, RN-08 |
| **Total** | **23 archivos** | **533** | **204 unitarias y 329 de integración** |

## 3. Cobertura

`npm run test:coverage` (reporte en HTML en `coverage/index.html`):

| Métrica | Resultado |
|---|---|
| Sentencias | **94.09 %** (1816 / 1930) |
| Ramas | **79.37 %** (812 / 1023) |
| Funciones | **94.59 %** (350 / 370) |
| Líneas | **96.35 %** (1665 / 1728) |

| Carpeta | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|
| `services/` | 93.17 % | 81.25 % | 95.36 % | 96.82 % |
| `services/eventos/` | 93.47 % | 93.10 % | 90.90 % | 97.43 % |
| `middlewares/` | 93.75 % | 84.90 % | 98.03 % | 95.41 % |
| `controllers/` | 88.05 % | 64.10 % | 84.61 % | 90.66 % |
| `models/` | 100 % | 88.23 % | 100 % | 100 % |
| `routes/` | 100 % | 100 % | 100 % | 100 % |
| `validators/` | 100 % | 100 % | 100 % | 100 % |
| `utils/` | 95.53 % | 72.36 % | 97.91 % | 95.71 % |
| `config/` | 96.29 % | 60.00 % | 100 % | 96.29 % |

Todos los servicios y middlewares superan el 70 % de líneas (el más bajo es `EquipoService` con 90 %). Lo que queda sin cubrir son sobre todo ramas de errores poco probables (por ejemplo, que falle la lectura de un archivo recién subido) y ramas de configuración que solo aplican en producción (cookie `secure`, `trust proxy`).

## 4. Pruebas manuales

Para hacerlas en el navegador: `npm run db:reset` y `npm run dev`, y abrir <http://localhost:3000>. Usuarios: `admin@tecnitrack.com`, `luis.fernandez@tecnitrack.com`, `jorge.pineda@tecnitrack.com`, `oscar.melendez@tecnitrack.com` (contraseña `Tecni2026!`).

### Conexión y arranque

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| M-01 | Arranque y navegadores (RNF-03) | `npm run dev`; abrir `/` en Chrome, Edge y Firefox | La terminal muestra "Conexión a MySQL correcta" y "escuchando en http://localhost:3000"; la portada se ve igual en los tres navegadores |
| M-02 | Vista de tablet (RNF-06) | Herramientas del navegador → modo dispositivo, 768 × 1024; recorrer `/admin`, `/tickets/nuevo`, `/tickets/2` | Formularios en una columna, tablas con desplazamiento horizontal, sin texto cortado |
| M-03 | Base de datos apagada | Detener MySQL en XAMPP y ejecutar `npm start`; abrir `/` | La terminal muestra "[BD] No se pudo conectar a MySQL: …"; el servidor arranca, pero las páginas responden el error genérico "Ocurrió un error inesperado" (sin detalles internos) hasta encender MySQL |

### Rutas y permisos

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| M-04 | Ruta inexistente | Abrir `/no-existe` | Página 404 "Página no encontrada" con la barra superior |
| M-05 | Sin sesión | Abrir `/admin` en una ventana de incógnito | Redirige a `/login` con el mensaje "Inicia sesión para continuar." |
| M-06 | Técnico en zona de admin | Como Luis, abrir `/admin`, `/usuarios`, `/reportes` y `/clientes/nuevo` | Página 403 "No tienes permiso para acceder a esta sección" |
| M-07 | Ticket ajeno | Como Luis, abrir `/tickets/2` (de Jorge) | 403 "Este ticket no está asignado a ti." |

### Autenticación

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| M-08 | Login por rol y mensajes | Entrar como admin, luego como Luis; probar una contraseña incorrecta y un correo inexistente; entrar como Óscar | Admin → `/admin`, Luis → `/tecnico`; los dos errores dan el mismo "Credenciales incorrectas"; Óscar → "Cuenta desactivada, contacte al administrador" |
| M-09 | Rate limit | 6 contraseñas incorrectas seguidas | El sexto intento responde "Demasiados intentos de inicio de sesión…" (429) |
| M-10 | Cerrar sesión y "atrás" | Como Luis, "Cerrar sesión" y luego el botón Atrás del navegador | Vuelve a `/login`; la página anterior no se muestra desde la caché |
| M-11 | Desactivar con sesión abierta | Luis con sesión abierta en un navegador; el admin lo desactiva en `/usuarios`; Luis hace clic en cualquier enlace | Luis sale a `/login` con "Tu sesión se cerró porque la cuenta fue desactivada." |

### Consultas y CRUD

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| M-12 | Búsqueda y paginación | Como admin, `/clientes`: buscar `71234567`; `/catalogo?tipo=Repuesto` | Aparece María Elena Hernández; solo repuestos; "Página 1 de 1" |
| M-13 | Cliente con equipo (transacción) | "Nuevo cliente" con equipo de serie `DL-88291` (repetida); luego con una serie nueva | El primero da error junto al número de serie y **no** crea el cliente; el segundo crea ambos (comprobar en phpMyAdmin: `clientes` y `equipos`) |
| M-14 | Validación con datos conservados | Nuevo cliente con teléfono `123` | Regresa al formulario con lo escrito y "El teléfono debe tener 8 dígitos" junto al campo |
| M-15 | Reglas de eliminación | Eliminar a Ana Lucía Martínez; eliminar la Dell Inspiron 15 de María | Piden confirmación y luego muestran "tiene 2 equipos registrados" y "tiene 3 tickets registrados" |
| M-16 | Catálogo | Precio `0`; desactivar "Cartucho de tinta genérico" | "El precio debe ser mayor a 0."; el ítem queda Inactivo y ya no aparece al cotizar |
| M-17 | Técnico de solo lectura | Como Luis, `/clientes/3` y `/catalogo` | Se ven los datos sin botones de crear, editar ni eliminar |
| M-18 | Reportes y CSV | Como admin, `/reportes` del 01/08/2026 al 31/08/2026; "Exportar CSV"; abrirlo en Excel | Jorge 2 / 3.6 días, Luis 2 / 2.6 días, Óscar (inactivo) 1 / 4.0 días; el CSV muestra bien las tildes |

### Flujo completo (técnico en ventana normal, cliente en incógnito)

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| M-19 | Crear ticket en menos de 2 minutos (RNF-01) | Como Luis, cronometrar "Nuevo ticket": cliente nuevo, equipo nuevo, diagnóstico, una foto | Se completa en menos de 2 minutos; folio TT-2026-0046, estado Recibido; la foto se ve en el detalle |
| M-20 | Flujo y botones | En el detalle, pasar a Diagnosticado; intentar "En reparación" | Solo se habilitan los pasos válidos; "En reparación" está deshabilitado (RN-01) |
| M-21 | Cotización | "Generar cotización", dos ítems, cambiar cantidades, enviar | El total cambia en vivo; pide confirmación; el ticket pasa a «Esperando aprobación» |
| M-22 | Respuesta del cliente | En incógnito, `/portal` con el folio nuevo y el teléfono; "Aprobar cotización"; volver atrás y aprobar otra vez | Ve ítems y total; tras aprobar, "En reparación"; la segunda vez, "Esta cotización ya fue aprobada. No se puede responder dos veces." |
| M-23 | Notificación al técnico | Volver a la ventana de Luis (esperar hasta 30 s o recargar) | La campana muestra el contador; el dashboard dice "Un cliente respondió una cotización"; en `/notificaciones` se marca como leída |
| M-24 | Cierre del flujo | Como Luis, pasar a Listo y a Entregado; en incógnito, recargar el portal | Se guarda la fecha de entrega; el portal muestra los seis estados del historial |
| M-25 | Foto protegida | Copiar la dirección de una foto del ticket y abrirla en otra ventana de incógnito sin sesión | 403: la foto no es accesible sin permiso |

## 5. Cómo ejecutar

```bash
npm test                 # todas las pruebas
npm run test:coverage    # con cobertura
npx cross-env NODE_ENV=test jest --runInBand tests/integration/tickets.test.js   # un solo archivo
npm run lint             # ESLint
```
