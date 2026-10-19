/**
 * Rutas: Consultar mi ticket — montadas en /portal (routes/index.js).
 *
 * Portal público del cliente, sin cuenta (HU-04, HU-05):
 *   GET  /portal                              formulario folio + teléfono
 *   POST /portal                              valida folio + teléfono (rate limit)
 *   GET  /portal/ticket                       estado del ticket (requireCliente)
 *   POST /portal/cotizaciones/:id/aprobar     aprueba la cotización Pendiente (HU-05, RN-06)
 *   POST /portal/cotizaciones/:id/rechazar    la rechaza, con motivo opcional (HU-05, RN-06)
 *   POST /portal/salir                        cierra el acceso del cliente
 *
 * El prefijo es /portal (y no /cliente) para no confundirlo con /clientes,
 * el módulo de administración de clientes.
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireCliente } = require('../middlewares/auth');
const { limitarPortal } = require('../middlewares/limitarIntentos');
const { reglasPortal } = require('../validators/authValidators');
const { reglasRespuestaCliente } = require('../validators/cotizacionValidators');
const PortalController = require('../controllers/portalController');

const router = Router();

router.get('/', PortalController.mostrarConsulta);
router.post('/', limitarPortal, validar(reglasPortal), asyncHandler(PortalController.consultar));
router.get('/ticket', requireCliente, asyncHandler(PortalController.verTicket));
router.post('/cotizaciones/:id/aprobar', requireCliente, asyncHandler(PortalController.responder('aprobar')));
router.post('/cotizaciones/:id/rechazar', requireCliente, validar(reglasRespuestaCliente), asyncHandler(PortalController.responder('rechazar')));
router.post('/salir', asyncHandler(PortalController.salir));

module.exports = router;
