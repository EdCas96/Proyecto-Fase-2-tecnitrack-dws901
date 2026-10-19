/**
 * Rutas: Dashboard — montadas en /admin (routes/index.js).
 *
 * Previstas (solo rol admin):
 *   GET /admin          panel con indicadores y tickets recientes
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Dashboard', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
