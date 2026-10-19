# Seguridad

Medidas de seguridad implementadas en TecniTrack, dónde están en el código y qué riesgo mitiga cada una. Las pruebas que las verifican están en `tests/integration/auth.test.js` y `tests/integration/middlewares.test.js`; la tabla completa está en [`TRAZABILIDAD.md`](TRAZABILIDAD.md).

## 1. Contraseñas

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| Las contraseñas se guardan solo como hash **bcrypt** (costo 10), nunca en texto plano (RN-08). | `AuthService.hashPassword`, seeders | Si alguien obtiene una copia de la base, no puede leer las contraseñas; bcrypt es lento a propósito, lo que encarece probarlas por fuerza bruta. |
| `password_hash` nunca sale de la base en una consulta normal: el modelo lo excluye por defecto y solo el scope `conPassword` (que usa únicamente el login) lo incluye. `toJSON()` también lo quita. | `models/Usuario.js` | Que el hash llegue por descuido a una vista, a un JSON o a un `include` de otra consulta. |
| Contraseña mínima: 8 caracteres, al menos una letra y un número. | `AuthService.validarFortaleza` | Contraseñas triviales, fáciles de adivinar. |
| Los formularios nunca devuelven la contraseña escrita (ni tras un error de validación ni tras un login fallido). | `errorHandler.js` (`CAMPOS_PRIVADOS`), `views/auth/login.ejs` | Que la contraseña quede en el HTML, en la caché del navegador o en la sesión (flash). |

## 2. Inicio de sesión

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| **Mensaje genérico** "Credenciales incorrectas" tanto si el correo no existe como si la contraseña falla. | `AuthService.login` | **Enumeración de usuarios:** descubrir qué correos tienen cuenta para luego atacarlos. |
| La cuenta desactivada solo se informa cuando la contraseña es correcta. | `AuthService.login` | Que el mensaje "Cuenta desactivada" revele que el correo existe. |
| Si el correo no existe se compara contra un **hash señuelo**, así que bcrypt siempre se ejecuta. | `AuthService.login` | Enumeración midiendo el **tiempo de respuesta** (sin hash, la respuesta sería mucho más rápida). |
| `session.regenerate()` al iniciar sesión: el id de sesión cambia. | `AuthController.iniciarSesion` | **Fijación de sesión:** un atacante que logró plantar un id de sesión en el navegador de la víctima no puede reutilizarlo después del login. |
| La sesión guarda solo `{ id, nombre, rol }`; las vistas reciben solo esos campos. | `AuthController`, `variablesVistas.js` | Exponer datos sensibles si la sesión o una vista se filtran. |
| **Rate limit:** 5 intentos fallidos por IP cada 15 minutos; después responde 429. Configurable con `LIMITE_INTENTOS` y `VENTANA_INTENTOS_MIN`. | `middlewares/limitarIntentos.js` | **Fuerza bruta** de contraseñas. Los logins correctos no consumen intentos, para no bloquear al personal. |
| Técnico desactivado no puede entrar (RN-07). | `AuthService.login` | Que un ex-empleado siga usando el sistema. |

## 3. Sesión y cierre de sesión

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| Cookie de sesión `httpOnly`, `sameSite=lax` y `secure` en producción; duración de 8 h. | `config/sesion.js` | `httpOnly`: robo de la cookie con JavaScript (XSS). `sameSite=lax`: envío de la cookie desde otros sitios (CSRF). `secure`: que viaje sin cifrar por HTTP. La duración limita el tiempo de uso de una cookie robada. |
| Sesiones guardadas en MySQL (tabla `sesiones`), no en la cookie. | `config/sesion.js` | La cookie solo lleva un id firmado; los datos no viajan al navegador y la sesión se puede invalidar desde el servidor. |
| `session.destroy()` al cerrar sesión y borrado de la cookie. | `AuthController.cerrarSesion` | Que la sesión siga siendo válida después de "Cerrar sesión" (por ejemplo, en una computadora compartida). |
| **Revalidación en cada petición:** `requireAuth` verifica en la base que el usuario siga existiendo y activo; si no, cierra la sesión en ese momento. También actualiza nombre y rol si cambiaron. | `middlewares/auth.js`, `AuthService.obtenerUsuarioActivo` | Que un técnico desactivado (o con el rol cambiado) siga trabajando con una sesión abierta hasta que expire. |
| Páginas autenticadas con `Cache-Control: no-store`, `Pragma: no-cache` y `Expires: 0`. | `middlewares/auth.js` › `sinCache` | Que tras cerrar sesión el botón "atrás" muestre datos guardados en la caché del navegador. |
| El logout es un `POST` con token CSRF (no un enlace `GET`). | `views/partials/navbar.ejs` | Que otro sitio cierre la sesión del usuario con una simple imagen o enlace. |

## 4. Control de acceso

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| `requireAuth` en todos los routers del personal: sin sesión redirige a `/login` (o 401 en JSON). | `middlewares/auth.js`, cada `routes/*.js` | Acceso anónimo a datos del taller. |
| `checkRole(...roles)` y `soloLecturaPara('tecnico')` aplican la matriz de permisos (RN-02): el técnico no entra a `/admin`, `/usuarios` ni `/reportes`, y solo consulta clientes, equipos y catálogo. Responde 403 "No tienes permiso para acceder a esta sección". | `middlewares/auth.js` | **Escalada de privilegios:** un técnico que escribe a mano la URL de una sección de administración. |
| El control se aplica en el router completo (`router.use`), antes que cualquier ruta. | `routes/*.js` | Olvidar proteger una ruta nueva del módulo. |

## 5. Portal del cliente

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| Acceso con folio **y** teléfono del dueño del equipo. El teléfono se normaliza (sin espacios, guiones ni paréntesis). | `AuthService.verificarAccesoCliente` | Que alguien vea un ticket ajeno solo con adivinar un folio correlativo. |
| Mensaje genérico "No se encontró un ticket con esos datos" para folio inexistente o teléfono incorrecto. | `AuthService.verificarAccesoCliente` | Descubrir qué folios existen. |
| Rate limit propio: 5 consultas fallidas por IP cada 15 minutos. | `middlewares/limitarIntentos.js` | Fuerza bruta de combinaciones folio + teléfono. |
| `session.regenerate()` y solo `clienteTicketId` en la sesión; `requireCliente` protege `/portal/ticket`. | `PortalController`, `middlewares/auth.js` | Fijación de sesión, y acceso del cliente a otro ticket o a las páginas del personal (el cliente no tiene `usuario` en sesión, así que `requireAuth` lo manda a `/login`). |

## 6. Formularios y peticiones

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| **CSRF** con csrf-csrf en todo `POST`/`PUT`/`PATCH`/`DELETE` (campo `_csrf`, cabecera `X-CSRF-Token` o, en formularios con fotos, `?_csrf=`). El token se liga al id de sesión. | `middlewares/csrf.js` | **Cross-Site Request Forgery:** otro sitio que envía un formulario en nombre del usuario con sesión abierta. |
| `method-override` solo convierte `POST` en `PUT`, `PATCH` o `DELETE`, nunca en `GET`. | `app.js` | Saltarse la verificación CSRF (los `GET` no se verifican). |
| Validación de entradas con express-validator (correo, campos obligatorios, folio `TT-AAAA-NNNN`, teléfono). | `validators/authValidators.js`, `middlewares/validar.js` | Datos mal formados que lleguen a los servicios o a la base. |
| Límite de 100 kb para formularios y JSON. | `app.js` | Peticiones enormes que agoten la memoria del servidor. |
| Subida de fotos: solo JPG, PNG o WEBP (MIME, extensión y firma real del archivo), tamaño máximo, máximo 5, nombres aleatorios. | `middlewares/upload.js` | Subir scripts o ejecutables disfrazados de imagen, sobrescribir archivos o llenar el disco. |
| **Fotos protegidas:** se guardan fuera de `public/` y solo se entregan con `GET /fotos/:id` al admin, al técnico asignado o al cliente que validó ese ticket, con `Cache-Control: private, no-store`. Se usa solo el nombre del archivo guardado (`path.basename`). | `services/FotoService.js`, `controllers/fotosController.js` | Que alguien vea fotos de equipos ajenos adivinando o compartiendo una URL, y que un valor manipulado lea archivos fuera de la carpeta (path traversal). |
| **Tickets por técnico:** el filtro "solo sus tickets" se aplica en la consulta de `TicketService` (no en la vista), y el detalle o un cambio de estado de un ticket ajeno responde 403. | `services/TicketService.js` | Que un técnico vea o modifique tickets de otros cambiando el id en la URL (RN-02). |
| Consultas con Sequelize (parámetros, nunca SQL concatenado con datos del usuario). | `services/` | **Inyección SQL.** |
| EJS escapa todo lo que se imprime con `<%= %>`. | `views/` | **XSS** con datos ingresados por usuarios (nombres, diagnósticos). |

## 7. Cabeceras y errores

| Medida | Dónde | Riesgo que mitiga |
|---|---|---|
| **helmet:** Content-Security-Policy, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, entre otras. | `app.js` | XSS (CSP), clickjacking (la app no se puede incrustar en un iframe), que el navegador adivine tipos de archivo, y filtrar URLs a otros sitios. |
| El manejador de errores nunca envía el stack ni mensajes internos; los 500 muestran un texto genérico y se registran solo en el servidor. Los errores de Sequelize se traducen sin mostrar SQL. | `middlewares/errorHandler.js`, `utils/traducirError.js` | Revelar rutas, versiones o la estructura de la base a un atacante. |
| `SESSION_SECRET` es obligatorio y está en `.env` (no se sube al repositorio). | `config/sesion.js`, `.gitignore` | Firmar cookies y tokens con un secreto conocido o vacío. |
