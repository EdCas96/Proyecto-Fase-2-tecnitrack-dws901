/**
 * Rutas: Cotizaciones — montadas en /cotizaciones (routes/index.js).
 *
 * Previstas (HU-03; RN-05, RN-06, RN-09):
 *   GET  /cotizaciones/nueva?ticket_id=   formulario con líneas del catálogo
 *   POST /cotizaciones                    crea y pasa el ticket a Esperando_aprobacion
 *   GET  /cotizaciones/:id                detalle
 *
 * Acceso: admin y técnico.
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, checkRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', EnConstruccionController.pagina('Cotizaciones', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
