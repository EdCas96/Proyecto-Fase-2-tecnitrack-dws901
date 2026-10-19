/**
 * Rutas: Consultar mi ticket — montadas en /portal (routes/index.js).
 *
 * Portal público del cliente, sin cuenta (HU-04, HU-05; rate limit):
 *   GET  /portal                              formulario folio + teléfono
 *   POST /portal/consulta                     busca el ticket
 *   GET  /portal/tickets/:folio               estado, historial y cotización
 *   POST /portal/cotizaciones/:id/aprobar     RN-06
 *   POST /portal/cotizaciones/:id/rechazar    RN-06
 *
 * El prefijo es /portal (y no /cliente) para no confundirlo con /clientes,
 * el módulo de administración de clientes.
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Consultar mi ticket', []));

module.exports = router;
