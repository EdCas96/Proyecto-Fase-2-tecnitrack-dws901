/**
 * Rutas: Dashboard — montadas en /admin (routes/index.js).
 *
 * Acceso: solo admin.
 *   GET /admin          panel del administrador (indicadores: pasos siguientes)
 */
const { Router } = require('express');
const { requireAuth, checkRole } = require('../middlewares/auth');
const DashboardController = require('../controllers/dashboardController');

const router = Router();

router.use(requireAuth, checkRole('admin'));

router.get('/', DashboardController.admin);

module.exports = router;
