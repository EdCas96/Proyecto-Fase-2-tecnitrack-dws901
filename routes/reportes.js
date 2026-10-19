/**
 * Rutas: Reportes — montadas en /reportes (routes/index.js).
 *
 * Previstas (HU-08; solo admin):
 *   GET /reportes   tickets por técnico y tiempo promedio Recibido -> Entregado
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Reportes', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
