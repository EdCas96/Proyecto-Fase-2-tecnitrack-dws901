/**
 * Rutas: Equipos — montadas en /equipos (routes/index.js).
 *
 * Previstas (HU-01; admin CRUD, técnico solo lectura):
 *   GET    /equipos/nuevo?cliente_id=   formulario
 *   POST   /equipos                     crea
 *   GET    /equipos/:id/editar          formulario de edición
 *   PUT    /equipos/:id                 actualiza
 *   DELETE /equipos/:id                 elimina (solo si no tiene tickets)
 *
 * Acceso: admin (el técnico solo consulta: GET).
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, soloLecturaPara } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, soloLecturaPara('tecnico'));

router.get('/', EnConstruccionController.pagina('Equipos', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
