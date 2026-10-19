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
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Equipos', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
