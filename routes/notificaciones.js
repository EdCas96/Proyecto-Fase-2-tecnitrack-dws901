/**
 * Rutas: Notificaciones — montadas en /notificaciones (routes/index.js).
 *
 * HU-10, RF-12 (personal con sesión; cada uno ve las suyas):
 *   GET   /notificaciones              listado (no leídas primero), paginado
 *   GET   /notificaciones/no-leidas    JSON { total } (la barra lo consulta cada 30 s)
 *   PATCH /notificaciones/leidas       marca todas como leídas
 *   PATCH /notificaciones/:id/leida    marca una como leída (ir_a_ticket=1: luego abre el ticket)
 *
 * Acceso: admin y técnico.
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, checkRole } = require('../middlewares/auth');
const NotificacionesController = require('../controllers/notificacionesController');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', asyncHandler(NotificacionesController.listar));
router.get('/no-leidas', asyncHandler(NotificacionesController.noLeidas));
router.patch('/leidas', asyncHandler(NotificacionesController.marcarTodas));
router.patch('/:id/leida', asyncHandler(NotificacionesController.marcarLeida));

module.exports = router;
