/**
 * Rutas: Mis tickets — montadas en /tecnico (routes/index.js).
 *
 * Acceso: técnico (y admin, que puede entrar a todo; RN-02).
 *   GET /tecnico        panel del técnico (sus tickets asignados: pasos siguientes)
 */
const { Router } = require('express');
const { requireAuth, checkRole } = require('../middlewares/auth');
const DashboardController = require('../controllers/dashboardController');

const router = Router();

router.use(requireAuth, checkRole('tecnico', 'admin'));

router.get('/', DashboardController.tecnico);

module.exports = router;
