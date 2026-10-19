/**
 * Rutas: Reportes — montadas en /reportes (routes/index.js).
 *
 * Previstas (HU-08; solo admin):
 *   GET /reportes   tickets por técnico y tiempo promedio Recibido -> Entregado
 *
 * Acceso: solo admin.
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, checkRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, checkRole('admin'));

router.get('/', EnConstruccionController.pagina('Reportes', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
