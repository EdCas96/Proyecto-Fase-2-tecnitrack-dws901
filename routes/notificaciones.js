/**
 * Rutas: Notificaciones — montadas en /notificaciones (routes/index.js).
 *
 * Previstas (HU-10; técnico en sesión):
 *   GET   /notificaciones              listado (no leídas primero)
 *   PATCH /notificaciones/:id/leida    marca como leída
 *
 * Acceso: personal con sesión (cada uno ve las suyas).
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, checkRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', EnConstruccionController.pagina('Notificaciones', [{ texto: 'Técnico', url: '/tecnico' }]));

module.exports = router;
