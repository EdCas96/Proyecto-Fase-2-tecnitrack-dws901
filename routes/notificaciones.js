/**
 * Rutas: Notificaciones — montadas en /notificaciones (routes/index.js).
 *
 * Previstas (HU-10; técnico en sesión):
 *   GET   /notificaciones              listado (no leídas primero)
 *   PATCH /notificaciones/:id/leida    marca como leída
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Notificaciones', [{ texto: 'Técnico', url: '/tecnico' }]));

module.exports = router;
