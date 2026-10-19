/**
 * Rutas: Cotizaciones — montadas en /cotizaciones (routes/index.js).
 *
 * HU-03; RN-02, RN-05, RN-06, RN-09 (técnico asignado o admin):
 *   GET  /cotizaciones                    listado (?estado=, ?vencidas=1 para "Pendiente de respuesta")
 *   GET  /cotizaciones/nueva?ticket_id=   formulario con ítems del catálogo activo
 *   POST /cotizaciones                    crea y pasa el ticket a Esperando_aprobacion
 *   GET  /cotizaciones/:id/editar         formulario (solo Pendiente)
 *   PUT  /cotizaciones/:id                actualiza ítems y recalcula el total
 *
 * La respuesta del cliente (aprobar/rechazar) está en el portal: routes/cliente.js.
 *
 * Acceso: admin y técnico (cada técnico solo las de sus tickets).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole } = require('../middlewares/auth');
const { reglasNuevaCotizacion } = require('../validators/cotizacionValidators');
const CotizacionesController = require('../controllers/cotizacionesController');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', asyncHandler(CotizacionesController.listar));
router.get('/nueva', asyncHandler(CotizacionesController.nueva));
router.post('/', validar(reglasNuevaCotizacion), asyncHandler(CotizacionesController.crear));
router.get('/:id/editar', asyncHandler(CotizacionesController.editar));
router.put('/:id', asyncHandler(CotizacionesController.actualizar));

module.exports = router;
