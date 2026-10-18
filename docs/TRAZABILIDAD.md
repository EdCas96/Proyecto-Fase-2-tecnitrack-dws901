# Matriz de trazabilidad

Relaciona cada historia de usuario con su requerimiento, las reglas de negocio que aplica, la ruta, el código que la implementa y la prueba que la verifica. Se actualiza en cada paso.

| Historia de usuario | Requerimiento | Regla | Ruta | Controlador/Servicio | Prueba que lo verifica |
|---|---|---|---|---|---|
| HU-01 | Admin registra clientes y equipos | — | *pendiente* | *pendiente* | *pendiente* |
| HU-02 | Técnico crea ticket con diagnóstico y fotos | RN-03 | *pendiente* | *pendiente* | *pendiente* |
| HU-03 | Técnico genera cotización | RN-06, RN-09 | *pendiente* | *pendiente* | *pendiente* |
| HU-04 | Cliente consulta su ticket con folio + teléfono | RN-05 | *pendiente* | *pendiente* | *pendiente* |
| HU-05 | Cliente aprueba/rechaza cotización | RN-01, RN-06 | *pendiente* | *pendiente* | *pendiente* |
| HU-06 | Técnico actualiza estado sin saltar el flujo | RN-01, RN-02, RN-04 | *pendiente* | *pendiente* | *pendiente* |
| HU-07 | Admin gestiona catálogo | — | *pendiente* | *pendiente* | *pendiente* |
| HU-08 | Admin ve reporte por técnico y tiempo promedio | — | *pendiente* | *pendiente* | *pendiente* |
| HU-09 | Admin gestiona técnicos | RN-07, RN-08 | *pendiente* | *pendiente* | *pendiente* |
| HU-10 | Técnico recibe notificación cuando el cliente responde | RN-06 | *pendiente* | *pendiente* | *pendiente* |

## Infraestructura (sin historia asociada)

| Elemento | Ruta | Archivo | Prueba que lo verifica |
|---|---|---|---|
| Página de prueba del entorno | `GET /` | `controllers/inicioController.js` | `tests/integration/servidor.test.js` |
| Cabeceras de seguridad (helmet) | todas | `app.js` | `tests/integration/servidor.test.js` |
| 404 y manejo central de errores | cualquier ruta inexistente | `middlewares/errores.js` | `tests/integration/servidor.test.js` |
| Conexión a MySQL | — | `config/database.js`, `server.js` | `tests/integration/servidor.test.js` |
