/**
 * Rutas: Mis tickets — montadas en /tecnico (routes/index.js).
 *
 * Previstas (solo rol técnico, RN-02):
 *   GET /tecnico        panel con los tickets asignados al técnico en sesión
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Mis tickets', [{ texto: 'Técnico', url: '/tecnico' }]));

module.exports = router;
