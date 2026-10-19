/**
 * Rutas: Reportes — montadas en /reportes (routes/index.js).
 *
 * HU-08, RF-11 (solo admin):
 *   GET /reportes                 tickets por técnico y tiempo promedio Recibido -> Entregado,
 *                                 servicios más solicitados y resumen por estado (?desde=&hasta=)
 *   GET /reportes/tecnicos.csv    el reporte por técnico en CSV (UTF-8 con BOM)
 *
 * Acceso: solo admin.
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, checkRole } = require('../middlewares/auth');
const ReportesController = require('../controllers/reportesController');

const router = Router();

router.use(requireAuth, checkRole('admin'));

router.get('/', asyncHandler(ReportesController.mostrar));
router.get('/tecnicos.csv', asyncHandler(ReportesController.exportarCsv));

module.exports = router;
